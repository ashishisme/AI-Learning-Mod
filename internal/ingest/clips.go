// SPEC: FR-CNT-13 (SPEC-014 FR-001..FR-004, FR-011, FR-013), AC-77
package ingest

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"unicode"
)

// ClipReport is one checked clip, printed by the release check.
type ClipReport struct {
	Lang, Lesson, Section, Clip string
	Steps                       int
	Seconds                     float64
	Bytes                       int
}

type clipDiagram struct {
	Type  string    `json:"type"`
	Clip  string    `json:"clip"`
	Media string    `json:"media"` // "video" for a video clip; empty for a step clip (a drawing)
	Cues  []float64 `json:"cues"`  // a video clip's cue start times; 5 cues when absent
	Alt   string    `json:"alt"`
	Steps []string  `json:"steps"`
}

type clipLesson struct {
	LessonID string `json:"lessonId"`
	Mode     string `json:"mode"`
	Sections []struct {
		ID      string       `json:"id"`
		Diagram *clipDiagram `json:"diagram"`
	} `json:"sections"`
}

const (
	maxClipBytes     = 100 * 1024 // a step clip's drawing
	maxVideoBytes    = 900 * 1024 // each video file of a video clip (SPEC-014 clarification 2026-11-15)
	defaultVideoCues = 5
)

var (
	clipName    = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)
	svgText     = regexp.MustCompile(`(?s)<text\b[^>]*>(.*?)</text>`)
	svgTag      = regexp.MustCompile(`<[^>]*>`)
	svgScript   = regexp.MustCompile(`(?i)<script`)
	svgHandler  = regexp.MustCompile(`(?i)\son[a-z]+\s*=`)
	svgHref     = regexp.MustCompile(`(?i)href\s*=\s*["']([^"']*)["']`)
	svgURL      = regexp.MustCompile(`(?i)url\(\s*['"]?([^'")\s]*)`)
	svgImport   = regexp.MustCompile(`(?i)@import`)
	stepGroupID = func(n int) *regexp.Regexp { return regexp.MustCompile(fmt.Sprintf(`\bid=["']s%d["']`, n)) }
)

// ClipSeconds estimates how long a clip plays: each caption read at 2.5 words a second, plus a second per step.
func ClipSeconds(steps []string) float64 {
	total := 0.0
	for _, s := range steps {
		total += float64(len(strings.Fields(s)))/2.5 + 1
	}
	return total
}

// CheckClips checks every clip in the English and translated Detailed lessons (FR-CNT-13). brandDir is the
// folder that holds clips/<name>.svg.
func CheckClips(contentDir, brandDir string) ([]ClipReport, error) {
	english := map[string]clipLesson{}
	var reports []ClipReport
	var problems []string

	check := func(lang, file string) {
		raw, err := os.ReadFile(file)
		if err != nil {
			problems = append(problems, err.Error())
			return
		}
		var l clipLesson
		if err := json.Unmarshal(raw, &l); err != nil {
			problems = append(problems, fmt.Sprintf("%s: %v", file, err))
			return
		}
		if lang == "en" {
			english[l.LessonID+"/"+l.Mode] = l // a lesson has one file per journey
		}
		for _, s := range l.Sections {
			d := s.Diagram
			if d == nil || d.Type != "clip" {
				continue
			}
			where := fmt.Sprintf("%s %s %s", lang, l.LessonID, s.ID)
			bad := func(format string, a ...any) { problems = append(problems, where+": "+fmt.Sprintf(format, a...)) }
			if lang != "en" {
				if e, ok := english[l.LessonID+"/"+l.Mode]; ok {
					if ec := clipOf(e, s.ID); ec == nil {
						bad("the English lesson has no clip in this section")
					} else if ec.Clip != d.Clip || ec.Media != d.Media || len(ec.Steps) != len(d.Steps) {
						bad("must show clip %q (media %q) with %d steps, as English does", ec.Clip, ec.Media, len(ec.Steps))
					}
				}
			}
			if !clipName.MatchString(d.Clip) {
				bad("clip name %q is not a kebab-case file name", d.Clip)
				continue
			}
			switch d.Media {
			case "video":
				reports = append(reports, checkVideoClip(lang, l.LessonID, s.ID, d, brandDir, bad))
				continue
			case "":
			default:
				bad("media %q is not \"video\" or empty", d.Media)
				continue
			}
			if n := len(d.Steps); n < 3 || n > 8 {
				bad("has %d steps; a clip has 3 to 8", n)
			}
			for i, step := range d.Steps {
				if w := len(strings.Fields(step)); w < 4 || w > 35 {
					bad("step %d has %d words; a caption has 4 to 35", i+1, w)
				}
			}
			secs := ClipSeconds(d.Steps)
			if secs < 10 || secs > 30 {
				bad("plays for about %.1f s; a clip lasts 10 to 30 s", secs)
			}
			if strings.TrimSpace(d.Alt) == "" {
				bad("has no alt description")
			}
			svg, err := os.ReadFile(filepath.Join(brandDir, "clips", d.Clip+".svg"))
			if err != nil {
				bad("drawing clips/%s.svg is missing", d.Clip)
				continue
			}
			for _, p := range drawingProblems(svg, len(d.Steps)) {
				bad("clips/%s.svg %s", d.Clip, p)
			}
			reports = append(reports, ClipReport{lang, l.LessonID, s.ID, d.Clip, len(d.Steps), secs, len(svg)})
		}
	}

	files, err := filepath.Glob(filepath.Join(contentDir, "lessons", "*.json"))
	if err != nil {
		return nil, err
	}
	for _, f := range files {
		check("en", f)
	}
	translated, err := filepath.Glob(filepath.Join(contentDir, "lang", "*", "lessons", "*.json"))
	if err != nil {
		return nil, err
	}
	for _, f := range translated {
		check(filepath.Base(filepath.Dir(filepath.Dir(f))), f)
	}
	// An English clip must be in every translated Detailed lesson too.
	for _, f := range translated {
		lang := filepath.Base(filepath.Dir(filepath.Dir(f)))
		raw, _ := os.ReadFile(f)
		var l clipLesson
		if json.Unmarshal(raw, &l) != nil {
			continue
		}
		for _, s := range english[l.LessonID+"/"+l.Mode].Sections {
			if s.Diagram != nil && s.Diagram.Type == "clip" && clipOf(l, s.ID) == nil {
				problems = append(problems, fmt.Sprintf("%s %s %s: clip %q is missing from the translation", lang, l.LessonID, s.ID, s.Diagram.Clip))
			}
		}
	}
	if len(problems) > 0 {
		return reports, errors.New(strings.Join(problems, "\n"))
	}
	return reports, nil
}

func clipOf(l clipLesson, sectionID string) *clipDiagram {
	for _, s := range l.Sections {
		if s.ID == sectionID && s.Diagram != nil && s.Diagram.Type == "clip" {
			return s.Diagram
		}
	}
	return nil
}

// drawingProblems applies the drawing rules of FR-CNT-13 to one clip SVG.
func drawingProblems(svg []byte, steps int) []string {
	var out []string
	if len(svg) > maxClipBytes {
		out = append(out, fmt.Sprintf("is %d bytes; a clip is at most %d", len(svg), maxClipBytes))
	}
	s := string(svg)
	for n := 1; n <= steps; n++ {
		if !stepGroupID(n).MatchString(s) {
			out = append(out, fmt.Sprintf("has no group s%d", n))
		}
	}
	if stepGroupID(steps + 1).MatchString(s) {
		out = append(out, fmt.Sprintf("has more step groups than the %d captions", steps))
	}
	for _, m := range svgText.FindAllStringSubmatch(s, -1) {
		if strings.IndexFunc(svgTag.ReplaceAllString(m[1], ""), unicode.IsLetter) >= 0 {
			out = append(out, "has words in a <text> element; words belong in the captions")
			break
		}
	}
	if svgScript.MatchString(s) {
		out = append(out, "has a <script>")
	}
	if svgHandler.MatchString(s) {
		out = append(out, "has an on…= event attribute")
	}
	if svgImport.MatchString(s) {
		out = append(out, "imports a style sheet")
	}
	for _, m := range svgHref.FindAllStringSubmatch(s, -1) {
		if !strings.HasPrefix(m[1], "#") {
			out = append(out, fmt.Sprintf("links outside the file (%s)", m[1]))
		}
	}
	for _, m := range svgURL.FindAllStringSubmatch(s, -1) {
		if !strings.HasPrefix(m[1], "#") {
			out = append(out, fmt.Sprintf("loads %s from outside the file", m[1]))
		}
	}
	return out
}

// checkVideoClip applies the video clip rules of FR-CNT-13 (amended 2.17.0): the WebM, MP4 and poster exist, each
// video file is at most 900 KB, there is one caption per cue and a description. Bytes reports the larger video file.
func checkVideoClip(lang, lesson, section string, d *clipDiagram, brandDir string, bad func(string, ...any)) ClipReport {
	cues := defaultVideoCues
	if len(d.Cues) > 0 {
		cues = len(d.Cues)
	}
	if len(d.Steps) != cues {
		bad("has %d captions for %d cues; a video clip has one caption per cue", len(d.Steps), cues)
	}
	if strings.TrimSpace(d.Alt) == "" {
		bad("has no alt description")
	}
	largest := 0
	for _, name := range []string{d.Clip + ".webm", d.Clip + ".mp4", d.Clip + "-poster.jpg"} {
		fi, err := os.Stat(filepath.Join(brandDir, "videos", name))
		if err != nil {
			bad("video file videos/%s is missing", name)
			continue
		}
		if strings.HasSuffix(name, ".jpg") {
			continue
		}
		if size := int(fi.Size()); size > maxVideoBytes {
			bad("videos/%s is %d KB; a video file is at most 900 KB", name, size/1024)
		} else if size > largest {
			largest = size
		}
	}
	return ClipReport{lang, lesson, section, d.Clip, len(d.Steps), ClipSeconds(d.Steps), largest}
}
