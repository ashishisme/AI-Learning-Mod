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

// SPEC: AC-79 (FR-CNT-13, amended 2.17.0). A video clip needs its WebM, MP4 and poster, each video at most 900 KB,
// one caption per cue and a description; a translation keeps the same clip and media.
func TestVideoClipRules(t *testing.T) {
	type fixture struct {
		steps, hiSteps []string
		hiMedia, alt   string
		files          map[string]int // file in videos/ -> size in bytes
	}
	five := []string{"Chip looks at the dog.", "The dog sits down now.", "Chip gives a small treat.", "The dog sits again soon.", "Now the dog has learned."}
	good := func() fixture {
		return fixture{steps: five, hiSteps: five, hiMedia: "video", alt: "Chip teaches a dog with treats.",
			files: map[string]int{"dog.webm": 600 * 1024, "dog.mp4": 800 * 1024, "dog-poster.jpg": 40 * 1024}}
	}
	run := func(t *testing.T, f fixture) ([]ClipReport, error) {
		root := t.TempDir()
		content, brand := filepath.Join(root, "public-content"), filepath.Join(root, "brand")
		lesson := func(media string, steps []string) []byte {
			raw, _ := json.Marshal(map[string]any{"lessonId": "1-intro", "mode": "junior", "sections": []any{map[string]any{
				"id": "what", "heading": "What", "bodyMarkdown": "Text.",
				"diagram": map[string]any{"type": "clip", "clip": "dog", "media": media, "caption": "Watch", "alt": f.alt, "steps": steps},
			}}})
			return raw
		}
		for p, body := range map[string][]byte{
			filepath.Join(content, "lessons", "1-intro.junior.json"):               lesson("video", f.steps),
			filepath.Join(content, "lang", "hi", "lessons", "1-intro.junior.json"): lesson(f.hiMedia, f.hiSteps),
		} {
			_ = os.MkdirAll(filepath.Dir(p), 0o755)
			if err := os.WriteFile(p, body, 0o644); err != nil {
				t.Fatal(err)
			}
		}
		_ = os.MkdirAll(filepath.Join(brand, "videos"), 0o755)
		for name, size := range f.files {
			if err := os.WriteFile(filepath.Join(brand, "videos", name), make([]byte, size), 0o644); err != nil {
				t.Fatal(err)
			}
		}
		return CheckClips(content, brand)
	}

	t.Run("valid, in a Kids lesson", func(t *testing.T) {
		reports, err := run(t, good())
		if err != nil {
			t.Fatalf("valid video clip refused: %v", err)
		}
		if len(reports) != 2 || reports[0].Bytes != 800*1024 {
			t.Fatalf("reports %+v", reports)
		}
	})
	for name, c := range map[string]struct {
		change func(*fixture)
		want   string
	}{
		"missing WebM":              {func(f *fixture) { delete(f.files, "dog.webm") }, "videos/dog.webm is missing"},
		"missing MP4":               {func(f *fixture) { delete(f.files, "dog.mp4") }, "videos/dog.mp4 is missing"},
		"missing poster":            {func(f *fixture) { delete(f.files, "dog-poster.jpg") }, "videos/dog-poster.jpg is missing"},
		"MP4 over 900 KB":           {func(f *fixture) { f.files["dog.mp4"] = 900*1024 + 1 }, "videos/dog.mp4 is 900 KB; a video file is at most 900 KB"},
		"WebM over 900 KB":          {func(f *fixture) { f.files["dog.webm"] = 901 * 1024 }, "videos/dog.webm is 901 KB"},
		"captions differ from cues": {func(f *fixture) { f.steps, f.hiSteps = five[:4], five[:4] }, "4 captions for 5 cues"},
		"no description":            {func(f *fixture) { f.alt = "" }, "has no alt description"},
		"Hindi as a drawing":        {func(f *fixture) { f.hiMedia = "" }, "as English does"},
	} {
		t.Run(name, func(t *testing.T) {
			f := good()
			c.change(&f)
			_, err := run(t, f)
			if err == nil || !strings.Contains(err.Error(), c.want) {
				t.Fatalf("want an error containing %q, got %v", c.want, err)
			}
		})
	}
}
