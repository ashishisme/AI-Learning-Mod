// SPEC: SPEC-009 FR-012, FR-014; contracts/content-files.md "audio manifest"

package narration

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// Personas are the narrators a learner can choose. Every track is recorded in each.
var Personas = []string{"chip", "nova", "alan"}

// Voice is one persona's synthesis settings from content/voices/<code>.json.
type Voice struct {
	Voice        string  `json:"voice"`
	SpeakingRate float64 `json:"speakingRate"`
	Pitch        float64 `json:"pitch"`
}

// Voices loads content/voices/<code>.json.
func Voices(root, code string) (map[string]Voice, error) {
	raw, err := os.ReadFile(filepath.Join(root, "content", "voices", code+".json"))
	if err != nil {
		return nil, err
	}
	var f struct {
		Personas map[string]Voice `json:"personas"`
	}
	if err := json.Unmarshal(raw, &f); err != nil {
		return nil, fmt.Errorf("content/voices/%s.json: %w", code, err)
	}
	return f.Personas, nil
}

// Hash identifies one recording: a change to the voice, its settings or the text records it again.
func Hash(v Voice, text string) string {
	sum := sha256.Sum256([]byte(fmt.Sprintf("%s|%g|%g\n%s", v.Voice, v.SpeakingRate, v.Pitch, text)))
	return hex.EncodeToString(sum[:])
}

// Recording is one MP3 in the manifest. File is relative to the language's audio directory.
type Recording struct {
	File  string `json:"file"`
	Hash  string `json:"hash"`
	Bytes int    `json:"bytes"`
}

// Manifest is public-content/audio/<code>/manifest.json: track key, then persona.
type Manifest struct {
	Language    string                          `json:"language"`
	GeneratedAt string                          `json:"generatedAt"`
	Tracks      map[string]map[string]Recording `json:"tracks"`
}

func AudioDir(root, code string) string { return filepath.Join(root, "public-content", "audio", code) }

// FileFor is where a track's recording for a persona lives, relative to AudioDir.
func FileFor(key, persona string) string { return key + "-" + persona + ".mp3" }

// LoadManifest reads a language's manifest. A missing file is an empty manifest.
func LoadManifest(root, code string) (*Manifest, error) {
	m := &Manifest{Language: code, Tracks: map[string]map[string]Recording{}}
	raw, err := os.ReadFile(filepath.Join(AudioDir(root, code), "manifest.json"))
	if errors.Is(err, os.ErrNotExist) {
		return m, nil
	} else if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(raw, m); err != nil {
		return nil, fmt.Errorf("audio manifest for %s: %w", code, err)
	}
	if m.Tracks == nil {
		m.Tracks = map[string]map[string]Recording{}
	}
	return m, nil
}

// Current reports whether a recording exists with this exact hash.
func (m *Manifest) Current(root, code, key, persona, hash string) bool {
	r, ok := m.Tracks[key][persona]
	if !ok || r.Hash != hash {
		return false
	}
	_, err := os.Stat(filepath.Join(AudioDir(root, code), filepath.FromSlash(r.File)))
	return err == nil
}

// Problem is a missing or out-of-date recording, printed as "LANG KEY: reason".
type Problem struct {
	Key    string
	Reason string
}

// Check finds every narrated track whose recording is missing or out of date, for every persona.
// It never calls the speech service.
func Check(root, code string) ([]Problem, error) {
	tracks, err := Tracks(root, code)
	if err != nil {
		return nil, err
	}
	voices, err := Voices(root, code)
	if err != nil {
		return nil, err
	}
	m, err := LoadManifest(root, code)
	if err != nil {
		return nil, err
	}
	var out []Problem
	for _, t := range tracks {
		for _, p := range Personas {
			v, ok := voices[p]
			switch {
			case !ok || v.Voice == "":
				out = append(out, Problem{t.Key, p + ": no voice chosen in content/voices/" + code + ".json"})
			case m.Current(root, code, t.Key, p, Hash(v, t.Text)):
			case m.Tracks[t.Key][p].Hash == Hash(v, t.Text):
				out = append(out, Problem{t.Key, p + ": recording file is missing"})
			case m.Tracks[t.Key][p].Hash != "":
				out = append(out, Problem{t.Key, p + ": recording is out of date"})
			default:
				out = append(out, Problem{t.Key, p + ": not recorded"})
			}
		}
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].Key < out[j].Key })
	return out, nil
}

// Summary shortens a long problem list to its first lines and a count, for build logs.
func Summary(ps []Problem, max int) []string {
	var out []string
	for i, p := range ps {
		if i == max {
			out = append(out, fmt.Sprintf("… and %d more", len(ps)-max))
			break
		}
		out = append(out, strings.TrimSpace(p.Key+": "+p.Reason))
	}
	return out
}
