// SPEC: AC-77 (FR-CNT-13); SPEC-014 T004
package ingest

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// fourSteps is a valid caption set: 4 captions of 9 words, about 18 seconds.
var fourSteps = []string{
	"Two kinds of fruit sit on a small grid.",
	"A first guess draws a line between the two.",
	"One pear lands on the wrong side of it.",
	"The line tilts until every fruit is sorted right.",
}

const goodSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180">
<style>.s{display:none}.s:target{display:inline}</style>
<rect width="320" height="180" fill="#FFFBEB"/>
<g id="s1" class="s"><text x="10" y="20">0.5</text></g><g id="s2" class="s"/><g id="s3" class="s"/>
<g id="s4" class="s"><use href="#s1"/></g></svg>`

type clipFixture struct {
	enSteps, hiSteps []string
	hiClip, alt, svg string
	noHindiClip      bool
	noSVG            bool
}

func writeClipFixture(t *testing.T, f clipFixture) (string, string) {
	t.Helper()
	root := t.TempDir()
	content, brand := filepath.Join(root, "public-content"), filepath.Join(root, "brand")
	lesson := func(clip string, steps []string, withClip bool) []byte {
		section := map[string]any{"id": "how", "heading": "How", "bodyMarkdown": "Text."}
		if withClip {
			section["diagram"] = map[string]any{"type": "clip", "clip": clip, "caption": "Watch", "alt": f.alt, "steps": steps}
		}
		raw, _ := json.Marshal(map[string]any{"lessonId": "3-neuralnetworks", "mode": "detailed", "sections": []any{section}})
		return raw
	}
	write := func(path string, body []byte) {
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, body, 0o644); err != nil {
			t.Fatal(err)
		}
	}
	write(filepath.Join(content, "lessons", "3-neuralnetworks.detailed.json"), lesson("line-learns", f.enSteps, true))
	write(filepath.Join(content, "lang", "hi", "lessons", "3-neuralnetworks.detailed.json"), lesson(f.hiClip, f.hiSteps, !f.noHindiClip))
	if !f.noSVG {
		write(filepath.Join(brand, "clips", "line-learns.svg"), []byte(f.svg))
	}
	return content, brand
}

func good() clipFixture {
	return clipFixture{enSteps: fourSteps, hiSteps: fourSteps, hiClip: "line-learns", alt: "A line learns to sort fruit.", svg: goodSVG}
}

func TestClipCheckPassesAValidClip(t *testing.T) {
	reports, err := CheckClips(writeClipFixture(t, good()))
	if err != nil {
		t.Fatalf("valid clip refused: %v", err)
	}
	if len(reports) != 2 || reports[0].Steps != 4 || reports[0].Seconds < 10 || reports[0].Seconds > 30 {
		t.Fatalf("unexpected reports %+v", reports)
	}
}

func TestClipCheckRefusals(t *testing.T) {
	long := strings.Repeat("word ", 36)
	cases := map[string]struct {
		change func(*clipFixture)
		want   string
	}{
		"too few steps": {func(f *clipFixture) { f.enSteps, f.hiSteps = fourSteps[:2], fourSteps[:2] }, "a clip has 3 to 8"},
		"too many steps": {func(f *clipFixture) {
			s := append(append([]string{}, fourSteps...), fourSteps...)
			s = append(s, fourSteps[0])
			f.enSteps, f.hiSteps = s, s
		}, "a clip has 3 to 8"},
		"short caption": {func(f *clipFixture) {
			s := append([]string{"Too short."}, fourSteps[1:]...)
			f.enSteps, f.hiSteps = s, s
		}, "a caption has 4 to 35"},
		"long caption": {func(f *clipFixture) { s := append([]string{long}, fourSteps[1:]...); f.enSteps, f.hiSteps = s, s }, "a caption has 4 to 35"},
		"too short to watch": {func(f *clipFixture) {
			s := []string{"one two three four", "one two three four", "one two three four"}
			f.enSteps, f.hiSteps = s, s
		}, "a clip lasts 10 to 30 s"},
		"no alt":                   {func(f *clipFixture) { f.alt = " " }, "has no alt description"},
		"missing drawing":          {func(f *clipFixture) { f.noSVG = true }, "is missing"},
		"Hindi names another clip": {func(f *clipFixture) { f.hiClip = "other" }, "as English does"},
		"Hindi with fewer steps":   {func(f *clipFixture) { f.hiSteps = fourSteps[:3] }, "as English does"},
		"Hindi without the clip":   {func(f *clipFixture) { f.noHindiClip = true }, "missing from the translation"},
		"missing step group":       {func(f *clipFixture) { f.svg = strings.Replace(goodSVG, `id="s4"`, `id="x4"`, 1) }, "has no group s4"},
		"extra step group":         {func(f *clipFixture) { f.svg = strings.Replace(goodSVG, `</svg>`, `<g id="s5"/></svg>`, 1) }, "more step groups"},
		"words in the picture":     {func(f *clipFixture) { f.svg = strings.Replace(goodSVG, ">0.5<", "><tspan>apple</tspan><", 1) }, "has words"},
		"script":                   {func(f *clipFixture) { f.svg = strings.Replace(goodSVG, `</svg>`, `<script>x()</script></svg>`, 1) }, "has a <script>"},
		"event attribute":          {func(f *clipFixture) { f.svg = strings.Replace(goodSVG, `<rect `, `<rect onload="x()" `, 1) }, "event attribute"},
		"outside link": {func(f *clipFixture) {
			f.svg = strings.Replace(goodSVG, `href="#s1"`, `href="https://example.org/a.svg"`, 1)
		}, "links outside the file"},
		"outside url": {func(f *clipFixture) {
			f.svg = strings.Replace(goodSVG, `fill="#FFFBEB"`, `style="fill:url(https://example.org/p)"`, 1)
		}, "from outside the file"},
		"too big": {func(f *clipFixture) {
			f.svg = strings.Replace(goodSVG, `</svg>`, "<!--"+strings.Repeat("x", maxClipBytes)+"--></svg>", 1)
		}, "a clip is at most"},
	}
	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			f := good()
			c.change(&f)
			_, err := CheckClips(writeClipFixture(t, f))
			if err == nil || !strings.Contains(err.Error(), c.want) {
				t.Fatalf("want an error containing %q, got %v", c.want, err)
			}
		})
	}
}

func TestClipNumbersAndSymbolsAreAllowedInThePicture(t *testing.T) {
	f := good()
	f.svg = strings.Replace(goodSVG, ">0.5<", "><tspan>+ − × = 25%</tspan><", 1)
	if _, err := CheckClips(writeClipFixture(t, f)); err != nil {
		t.Fatalf("numbers and symbols refused: %v", err)
	}
}

// SPEC-014 SC-001 (T027): every Detailed section shows a picture, a clip or its activity widget.
func TestEveryDetailedSectionHasAPicture(t *testing.T) {
	t.Skip("SPEC-014 T035: turned on once every lesson's clips are approved")
	files, err := filepath.Glob(filepath.Join("..", "..", "public-content", "lessons", "*.detailed.json"))
	if err != nil || len(files) == 0 {
		t.Fatalf("no Detailed lessons found: %v", err)
	}
	for _, f := range files {
		raw, err := os.ReadFile(f)
		if err != nil {
			t.Fatal(err)
		}
		var l struct {
			Sections []struct {
				ID      string          `json:"id"`
				Diagram json.RawMessage `json:"diagram"`
				Widget  json.RawMessage `json:"interactiveWidget"`
			} `json:"sections"`
		}
		if err := json.Unmarshal(raw, &l); err != nil {
			t.Fatal(err)
		}
		for _, s := range l.Sections {
			if len(s.Diagram) == 0 && len(s.Widget) == 0 {
				t.Errorf("%s: section %s has no picture, clip or widget", filepath.Base(f), s.ID)
			}
		}
	}
}
