// SPEC: SPEC-009 FR-012, FR-014, FR-015; contracts/cli.md "cmd/narrate"

// Command narrate records every narrated track of a language with Google Cloud Text-to-Speech, in each
// persona's voice, into public-content/audio/<code>/ with a manifest. A track whose voice and text
// are unchanged is never recorded again, so a re-run costs nothing. It runs on the owner's machine
// with a short-lived token from `gcloud auth print-access-token`; no key is stored anywhere.
package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"ai-foundations-coach/internal/i18n"
	"ai-foundations-coach/internal/narration"
)

func main() {
	os.Exit(run(".", os.Args[1:], os.Getenv, os.Stdout, os.Stderr))
}

// The API takes at most 5,000 bytes of text per request; keep a margin.
const maxBytes = 4800

func run(root string, args []string, getenv func(string) string, stdout, stderr io.Writer) int {
	fs := flag.NewFlagSet("narrate", flag.ContinueOnError)
	fs.SetOutput(stderr)
	lang := fs.String("lang", "", "language code from languages.json, for example hi")
	only := fs.String("only", "", "record just this track key, for example global/chip-mascot-greeting")
	check := fs.Bool("check", false, "report missing or out-of-date recordings; make no request")
	dryRun := fs.Bool("dry-run", false, "list what would be recorded and the characters billed; make no request")
	sample := fs.String("sample", "", "listening test: record the greeting with this voice to narration-sample-<voice>.mp3 and stop")
	if err := fs.Parse(args); err != nil {
		return 2
	}
	langs, err := i18n.Load(filepath.Join(root, "public-content"))
	if err != nil {
		fmt.Fprintln(stderr, err)
		return 2
	}
	var speechLang string
	for _, l := range langs.All() {
		if l.Code == *lang && l.Code != i18n.English.Code {
			speechLang = l.SpeechLang
		}
	}
	if speechLang == "" {
		fmt.Fprintf(stderr, "-lang %q is not a language in public-content/languages.json\n", *lang)
		return 2
	}

	if *check {
		problems, err := narration.Check(root, *lang)
		if err != nil {
			fmt.Fprintln(stderr, err)
			return 2
		}
		for _, p := range problems {
			fmt.Fprintf(stdout, "%s %s: %s\n", *lang, p.Key, p.Reason)
		}
		if len(problems) > 0 {
			return 1
		}
		fmt.Fprintln(stdout, "all recordings present and current")
		return 0
	}

	tracks, err := narration.Tracks(root, *lang)
	if err != nil {
		fmt.Fprintln(stderr, err)
		return 2
	}
	token := strings.TrimSpace(getenv("TTS_ACCESS_TOKEN"))
	tts := &client{endpoint: strings.TrimRight(getenv("TTS_ENDPOINT"), "/"), token: token, project: getenv("TTS_PROJECT"), lang: speechLang}
	if tts.endpoint == "" {
		tts.endpoint = "https://texttospeech.googleapis.com"
	}
	needToken := func() bool {
		if token == "" {
			fmt.Fprintln(stderr, `set TTS_ACCESS_TOKEN="$(gcloud auth print-access-token)" and TTS_PROJECT=<billing project>`)
			return false
		}
		return true
	}

	if *sample != "" {
		var text string
		for _, t := range tracks {
			if t.Key == "global/chip-mascot-greeting" {
				text = t.Text
			}
		}
		if !needToken() {
			return 2
		}
		audio, err := tts.speak(narration.Voice{Voice: *sample, SpeakingRate: 1}, text)
		if err != nil {
			fmt.Fprintln(stderr, tts.redact(err.Error()))
			return 1
		}
		name := "narration-sample-" + strings.NewReplacer("/", "_", "\\", "_").Replace(*sample) + ".mp3"
		if err := os.WriteFile(filepath.Join(root, name), audio, 0o644); err != nil {
			fmt.Fprintln(stderr, err)
			return 1
		}
		fmt.Fprintf(stdout, "wrote %s (%d characters billed)\n", name, len([]rune(text)))
		return 0
	}

	voices, err := narration.Voices(root, *lang)
	if err != nil {
		fmt.Fprintln(stderr, err)
		return 2
	}
	for _, p := range narration.Personas {
		if voices[p].Voice == "" {
			fmt.Fprintf(stderr, "choose a voice for %s in content/voices/%s.json first (try -sample <voice>)\n", p, *lang)
			return 2
		}
	}
	manifest, err := narration.LoadManifest(root, *lang)
	if err != nil {
		fmt.Fprintln(stderr, err)
		return 2
	}

	type job struct {
		key, persona, text, hash string
	}
	var todo []job
	wanted := map[string]bool{}
	chars := 0
	for _, t := range tracks {
		if *only != "" && t.Key != *only {
			continue
		}
		for _, p := range narration.Personas {
			h := narration.Hash(voices[p], t.Text)
			wanted[t.Key+"|"+p] = true
			if !manifest.Current(root, *lang, t.Key, p, h) {
				todo = append(todo, job{t.Key, p, t.Text, h})
				chars += len([]rune(t.Text))
			}
		}
	}
	if *only != "" && len(wanted) == 0 {
		fmt.Fprintf(stderr, "no track %q\n", *only)
		return 2
	}
	if *dryRun {
		for _, j := range todo {
			fmt.Fprintf(stdout, "%s %s\n", j.key, j.persona)
		}
		fmt.Fprintf(stdout, "%d recordings to make, %d characters billed; no request made\n", len(todo), chars)
		return 0
	}
	if len(todo) > 0 && !needToken() {
		return 2
	}

	dir := narration.AudioDir(root, *lang)
	failed := 0
	for _, j := range todo {
		audio, err := tts.speak(voices[j.persona], j.text)
		if err != nil {
			fmt.Fprintf(stderr, "%s %s: %s\n", j.key, j.persona, tts.redact(err.Error()))
			failed++
			continue
		}
		file := narration.FileFor(j.key, j.persona)
		full := filepath.Join(dir, filepath.FromSlash(file))
		if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
			fmt.Fprintln(stderr, err)
			return 1
		}
		if err := os.WriteFile(full, audio, 0o644); err != nil {
			fmt.Fprintln(stderr, err)
			return 1
		}
		if manifest.Tracks[j.key] == nil {
			manifest.Tracks[j.key] = map[string]narration.Recording{}
		}
		manifest.Tracks[j.key][j.persona] = narration.Recording{File: file, Hash: j.hash, Bytes: len(audio)}
		// Saved after every recording, so an interrupted run keeps what it paid for.
		if err := save(dir, manifest); err != nil {
			fmt.Fprintln(stderr, err)
			return 1
		}
	}

	// A full run drops recordings of tracks that no longer exist.
	if *only == "" {
		for key, byPersona := range manifest.Tracks {
			for p, r := range byPersona {
				if !wanted[key+"|"+p] {
					_ = os.Remove(filepath.Join(dir, filepath.FromSlash(r.File)))
					delete(byPersona, p)
				}
			}
			if len(byPersona) == 0 {
				delete(manifest.Tracks, key)
			}
		}
		if err := save(dir, manifest); err != nil {
			fmt.Fprintln(stderr, err)
			return 1
		}
	}
	fmt.Fprintf(stdout, "%d recorded, %d characters billed, %d failed\n", len(todo)-failed, chars, failed)
	if failed > 0 {
		return 1
	}
	return 0
}

func save(dir string, m *narration.Manifest) error {
	m.GeneratedAt = time.Now().UTC().Format(time.RFC3339)
	raw, err := json.MarshalIndent(m, "", "  ")
	if err != nil {
		return err
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(dir, "manifest.json"), append(raw, '\n'), 0o644)
}

type client struct {
	endpoint, token, project, lang string
	http                           http.Client
}

func (c *client) redact(s string) string {
	if c.token != "" {
		s = strings.ReplaceAll(s, c.token, "[redacted]")
	}
	return s
}

// speak records text in one voice. Text over the request limit is split at sentence ends and the
// MP3 parts are joined, which is valid for MP3 frames of the same encoding.
func (c *client) speak(v narration.Voice, text string) ([]byte, error) {
	var out []byte
	for _, part := range split(text, maxBytes) {
		audio, err := c.synthesize(v, part)
		if err != nil {
			return nil, err
		}
		out = append(out, audio...)
	}
	return out, nil
}

func (c *client) synthesize(v narration.Voice, text string) ([]byte, error) {
	rate := v.SpeakingRate
	if rate == 0 {
		rate = 1
	}
	body, _ := json.Marshal(map[string]any{
		"input":       map[string]string{"text": text},
		"voice":       map[string]string{"languageCode": c.lang, "name": v.Voice},
		"audioConfig": map[string]any{"audioEncoding": "MP3", "speakingRate": rate, "pitch": v.Pitch},
	})
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.endpoint+"/v1/text:synthesize", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Content-Type", "application/json")
	if c.project != "" {
		req.Header.Set("X-Goog-User-Project", c.project) // bills a user login to this project
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 20<<20))
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("speech service: %s: %s", resp.Status, strings.TrimSpace(string(raw)))
	}
	var r struct {
		AudioContent string `json:"audioContent"`
	}
	if err := json.Unmarshal(raw, &r); err != nil || r.AudioContent == "" {
		return nil, fmt.Errorf("speech service sent no audio")
	}
	return base64.StdEncoding.DecodeString(r.AudioContent)
}

// split cuts text into parts of at most max bytes, at sentence ends (। . ? !) where possible, then at
// spaces, and only as a last resort inside a word (on a rune boundary).
func split(text string, max int) []string {
	var parts []string
	for len(text) > max {
		cut := lastIndexAny(text[:max], []string{"। ", ". ", "? ", "! ", "।", "\n"})
		if cut <= 0 {
			cut = strings.LastIndex(text[:max], " ")
		}
		if cut <= 0 {
			cut = max
			for cut > 0 && (text[cut]&0xC0) == 0x80 { // not in the middle of a character
				cut--
			}
		}
		parts = append(parts, strings.TrimSpace(text[:cut]))
		text = strings.TrimSpace(text[cut:])
	}
	if text != "" {
		parts = append(parts, text)
	}
	return parts
}

// lastIndexAny returns the end of the last separator found in s, or -1.
func lastIndexAny(s string, seps []string) int {
	best := -1
	for _, sep := range seps {
		if i := strings.LastIndex(s, sep); i >= 0 && i+len(sep) > best {
			best = i + len(sep)
		}
	}
	return best
}
