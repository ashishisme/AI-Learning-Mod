// SPEC: SPEC-009 FR-007, FR-008, FR-017, FR-020, FR-021; contracts/cli.md "cmd/translate"

// Command translate drafts translations of the app's own content (adaptive lessons, quizzes, UI text)
// with an OpenAI-compatible model, for a native reviewer to correct and approve. It runs only on the
// owner's machine. The key is read from the environment and never written, logged or sent anywhere
// but the model endpoint; it is never set in CI, Terraform or the image (FR-021).
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"ai-foundations-coach/internal/i18n"

	openai "github.com/sashabaranov/go-openai"
)

func main() {
	os.Exit(run(".", os.Args[1:], os.Getenv, os.Stdout, os.Stderr))
}

// Characters per model request. A lesson is split into several requests above this.
const batchChars = 12000

type field struct {
	path []any // object keys (string) and array indexes (int) from the file root
	text string
}

func run(root string, args []string, getenv func(string) string, stdout, stderr io.Writer) int {
	fs := flag.NewFlagSet("translate", flag.ContinueOnError)
	fs.SetOutput(stderr)
	lang := fs.String("lang", "", "language code from languages.json, for example hi")
	kind := fs.String("kind", "all", "adaptive, quiz, ui or all")
	only := fs.String("only", "", "translate just this file, as its path in the review ledger")
	force := fs.Bool("force", false, "overwrite a file even if it is approved and current")
	dryRun := fs.Bool("dry-run", false, "count the fields and characters; make no request")
	if err := fs.Parse(args); err != nil {
		return 2
	}
	langs, err := i18n.Load(filepath.Join(root, "public-content"))
	if err != nil {
		fmt.Fprintln(stderr, err)
		return 2
	}
	var listed bool
	for _, l := range langs.All() {
		listed = listed || (l.Code == *lang && l.Code != i18n.English.Code)
	}
	if !listed {
		fmt.Fprintf(stderr, "-lang %q is not a language in public-content/languages.json\n", *lang)
		return 2
	}
	if *kind != "all" && *kind != i18n.KindAdaptive && *kind != i18n.KindQuiz && *kind != i18n.KindUI {
		fmt.Fprintf(stderr, "-kind must be adaptive, quiz, ui or all\n")
		return 2
	}

	targets, err := i18n.Targets(root, *lang)
	if err != nil {
		fmt.Fprintln(stderr, err)
		return 2
	}
	var todo []i18n.Target
	for _, t := range targets {
		if t.Kind != i18n.KindBase && (*kind == "all" || *kind == t.Kind) && (*only == "" || *only == t.Path) {
			todo = append(todo, t)
		}
	}
	if len(todo) == 0 {
		fmt.Fprintln(stderr, "nothing to translate for these flags")
		return 2
	}
	ledger, err := i18n.LoadLedger(root, *lang)
	if err != nil {
		fmt.Fprintln(stderr, err)
		return 2
	}

	var client *openai.Client
	key := getenv("TRANSLATE_API_KEY")
	model := getenv("TRANSLATE_MODEL")
	if !*dryRun {
		if key == "" || model == "" {
			fmt.Fprintln(stderr, "set TRANSLATE_API_KEY and TRANSLATE_MODEL (and TRANSLATE_BASE_URL for a non-OpenAI endpoint)")
			return 2
		}
		cfg := openai.DefaultConfig(key)
		if base := getenv("TRANSLATE_BASE_URL"); base != "" {
			cfg.BaseURL = base
		}
		client = openai.NewClientWithConfig(cfg)
	}
	redact := func(s string) string {
		if key != "" {
			s = strings.ReplaceAll(s, key, "[redacted]")
		}
		return s
	}
	system, err := systemPrompt(root, *lang, langs)
	if err != nil {
		fmt.Fprintln(stderr, err)
		return 2
	}

	failed, totalFields, totalChars := false, 0, 0
	for _, t := range todo {
		if !*force && approvedAndCurrent(root, t, ledger) {
			fmt.Fprintf(stdout, "%s: approved and current; left alone (use -force to redo)\n", t.Path)
			continue
		}
		var doc any
		if err := readJSON(filepath.Join(root, filepath.FromSlash(t.Source)), &doc); err != nil {
			fmt.Fprintln(stderr, err)
			return 1
		}
		fields := collect(t.Kind, doc)
		chars := 0
		for _, f := range fields {
			chars += len([]rune(f.text))
		}
		totalFields, totalChars = totalFields+len(fields), totalChars+chars
		if *dryRun {
			fmt.Fprintf(stdout, "%s: %d fields, %d characters\n", t.Path, len(fields), chars)
			continue
		}
		translated, problem := translateFields(client, model, system, fields)
		if problem != "" {
			fmt.Fprintf(stderr, "%s: %s; nothing written\n", t.Path, redact(problem))
			failed = true
			continue
		}
		for i, f := range fields {
			doc = set(doc, f.path, translated[i])
		}
		if err := writeJSON(filepath.Join(root, filepath.FromSlash(t.Path)), doc); err != nil {
			fmt.Fprintln(stderr, err)
			return 1
		}
		src, err1 := i18n.SourceHash(root, t)
		tr, err2 := i18n.HashFile(filepath.Join(root, filepath.FromSlash(t.Path)))
		if err := errors.Join(err1, err2); err != nil {
			fmt.Fprintln(stderr, err)
			return 1
		}
		ledger.Upsert(i18n.Entry{Path: t.Path, Kind: t.Kind, SourceHash: src, TranslationHash: tr})
		if err := ledger.Save(root); err != nil {
			fmt.Fprintln(stderr, err)
			return 1
		}
		fmt.Fprintf(stdout, "%s: %d fields translated; draft recorded for review\n", t.Path, len(fields))
	}
	if *dryRun {
		fmt.Fprintf(stdout, "total: %d fields, %d characters; no request made\n", totalFields, totalChars)
	}
	if failed {
		return 1
	}
	return 0
}

// approvedAndCurrent is true when the ledger approves this exact translation of this exact source.
func approvedAndCurrent(root string, t i18n.Target, l *i18n.Ledger) bool {
	e := l.Find(t.Path)
	if e == nil || e.Status != i18n.ReviewApproved {
		return false
	}
	src, err1 := i18n.SourceHash(root, t)
	tr, err2 := i18n.HashFile(filepath.Join(root, filepath.FromSlash(t.Path)))
	return err1 == nil && err2 == nil && src == e.SourceHash && tr == e.TranslationHash
}

func systemPrompt(root, code string, langs *i18n.Set) (string, error) {
	name := code
	for _, l := range langs.All() {
		if l.Code == code {
			name = l.Name
		}
	}
	var glossary struct {
		Terms []struct{ En, Target, Note string } `json:"terms"`
	}
	if err := readJSON(filepath.Join(root, "content", "glossary", code+".json"), &glossary); err != nil && !errors.Is(err, os.ErrNotExist) {
		return "", err
	}
	var b strings.Builder
	fmt.Fprintf(&b, `You translate an AI course for school-age learners in India from English into %s (%s).
Rules:
- Use everyday %s that a 12-year-old understands. Keep sentences short and friendly.
- At the first use of a technical term in each text, write the %s term followed by the English in brackets, for example "तंत्रिका नेटवर्क (neural network)". Later in the same text, the %s term alone is enough.
- Keep unchanged: Markdown structure (headings, list items, links and their URLs), code spans, fenced code, {placeholders}, <b> and </b> marks, the § sign and anything after it up to the end of the citation, and names of people, products and code.
- You receive a JSON object of numbered texts. Reply with only a JSON object with exactly the same numbers, each mapped to its translation.
`, name, code, name, name, name)
	if len(glossary.Terms) > 0 {
		b.WriteString("Use these terms:\n")
		for _, t := range glossary.Terms {
			fmt.Fprintf(&b, "- %s: %s", t.En, t.Target)
			if t.Note != "" {
				fmt.Fprintf(&b, " (%s)", t.Note)
			}
			b.WriteString("\n")
		}
	}
	return b.String(), nil
}

// collect lists the fields a translation may change, in a stable order. Every UI string is one.
func collect(kind string, doc any) []field {
	var out []field
	var walk func(pattern string, path []any, v any)
	walk = func(pattern string, path []any, v any) {
		switch x := v.(type) {
		case map[string]any:
			keys := make([]string, 0, len(x))
			for k := range x {
				keys = append(keys, k)
			}
			sort.Strings(keys)
			for _, k := range keys {
				p := k
				switch {
				case kind == i18n.KindQuiz && len(path) == 0:
					p = "*"
				case pattern != "":
					p = pattern + "." + k
				}
				walk(p, append(append([]any(nil), path...), k), x[k])
			}
		case []any:
			for i, e := range x {
				walk(pattern+"[]", append(append([]any(nil), path...), i), e)
			}
		case string:
			if strings.TrimSpace(x) != "" && (kind == i18n.KindUI || allowed(kind, pattern)) {
				out = append(out, field{path: path, text: x})
			}
		}
	}
	walk("", nil, doc)
	return out
}

func allowed(kind, pattern string) bool {
	for _, a := range i18n.Translatable[kind] {
		if a == pattern {
			return true
		}
	}
	return false
}

// translateFields sends the fields in batches and checks every answer before any file is written.
func translateFields(client *openai.Client, model, system string, fields []field) ([]string, string) {
	out := make([]string, len(fields))
	for start := 0; start < len(fields); {
		end, size := start, 0
		for end < len(fields) && (end == start || size+len(fields[end].text) <= batchChars) {
			size += len(fields[end].text)
			end++
		}
		batch := map[string]string{}
		for i := start; i < end; i++ {
			batch[strconv.Itoa(i)] = fields[i].text
		}
		user, _ := json.Marshal(batch)
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
		resp, err := client.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
			Model:       model,
			Temperature: 0.2,
			Messages: []openai.ChatCompletionMessage{
				{Role: openai.ChatMessageRoleSystem, Content: system},
				{Role: openai.ChatMessageRoleUser, Content: string(user)},
			},
		})
		cancel()
		if err != nil {
			return nil, "model request failed: " + err.Error()
		}
		if len(resp.Choices) == 0 {
			return nil, "the model sent no answer"
		}
		var got map[string]string
		content := strings.TrimSpace(resp.Choices[0].Message.Content)
		content = strings.TrimSuffix(strings.TrimPrefix(strings.TrimPrefix(content, "```json"), "```"), "```")
		if err := json.Unmarshal([]byte(strings.TrimSpace(content)), &got); err != nil {
			return nil, "the model's answer is not the JSON object asked for"
		}
		for i := start; i < end; i++ {
			tr, ok := got[strconv.Itoa(i)]
			if !ok || strings.TrimSpace(tr) == "" {
				return nil, fmt.Sprintf("field %s has no translation", describe(fields[i].path))
			}
			if r := i18n.Preserved(fields[i].text, tr); r != "" {
				return nil, fmt.Sprintf("field %s: %s", describe(fields[i].path), r)
			}
			out[i] = tr
		}
		start = end
	}
	return out, ""
}

func describe(path []any) string {
	var b strings.Builder
	for _, p := range path {
		switch v := p.(type) {
		case int:
			fmt.Fprintf(&b, "[%d]", v)
		case string:
			if b.Len() > 0 {
				b.WriteString(".")
			}
			b.WriteString(v)
		}
	}
	return b.String()
}

func set(doc any, path []any, value string) any {
	if len(path) == 0 {
		return value
	}
	switch p := path[0].(type) {
	case string:
		m := doc.(map[string]any)
		m[p] = set(m[p], path[1:], value)
	case int:
		a := doc.([]any)
		a[p] = set(a[p], path[1:], value)
	}
	return doc
}

func readJSON(p string, v any) error {
	raw, err := os.ReadFile(p)
	if err != nil {
		return err
	}
	if err := json.Unmarshal(raw, v); err != nil {
		return fmt.Errorf("%s: %w", p, err)
	}
	return nil
}

// writeJSON keeps < > & readable for the reviewer, rather than as < escapes.
func writeJSON(p string, v any) error {
	var b bytes.Buffer
	enc := json.NewEncoder(&b)
	enc.SetEscapeHTML(false)
	enc.SetIndent("", "  ")
	if err := enc.Encode(v); err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
		return err
	}
	return os.WriteFile(p, b.Bytes(), 0o644)
}
