// SPEC: FR-CNT-08, FR-CNT-09 (SPEC-012), AC-60, AC-61
package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

func kidsRepo(t *testing.T, lesson string, register bool) (root, contentDir string) {
	t.Helper()
	root = t.TempDir()
	contentDir = filepath.Join(root, "public-content")
	writeFile(t, filepath.Join(contentDir, "lessons", "3-nn.junior.json"), lesson)
	svg := `<svg xmlns="http://www.w3.org/2000/svg"/>`
	writeFile(t, filepath.Join(root, "web", "public", "brand", "words", "neuron-switch.svg"), svg)
	if register {
		sum := sha256.Sum256([]byte(svg))
		writeFile(t, filepath.Join(root, "design", "brand", "asset-register.json"),
			`{"schemaVersion":1,"assets":[{"id":"word-neuron-switch","status":"approved","trademarkScreen":"clear","releaseFiles":[{"path":"words/neuron-switch.svg","sha256":"`+hex.EncodeToString(sum[:])+`"}]}]}`)
	}
	return root, contentDir
}

const bandedOK = `{"lessonId":"3-nn","mode":"junior","bands":true,"recap":["a","b","c"],"sections":[{"id":"s1","heading":"H",` +
	`"bigIdea":"A neuron is a switch.","bodyMarkdown":"A **neuron** is a tiny switch.",` +
	`"jargonBuster":[{"term":"neuron","simpleExplanation":"A switch.","visual":"neuron-switch"}]}]}`

var lineRe = regexp.MustCompile(`^kids-check: (WARN|FAIL) 3-nn\.junior (8-11|12-14|-) section=\S+ rule=[a-z-]+ .+$|^kids-check: 3-nn (8-11 |12-14) grade=-?\d+\.\d avgSentence=\d+\.\d longest=\d+ maxNewWords=\d+ missingTerms=\d+$`)

// kidsRepoT lets runKids(kidsRepoT(...)) read as one call.
func kidsRepoT(t *testing.T, lesson string, register bool) (*testing.T, string, string) {
	root, dir := kidsRepo(t, lesson, register)
	return t, root, dir
}

func runKids(t *testing.T, root, contentDir string) (int, []string) {
	var out bytes.Buffer
	code := kidsCheck(root, contentDir, &out)
	lines := strings.Split(strings.TrimSpace(out.String()), "\n")
	for _, l := range lines {
		if !lineRe.MatchString(l) {
			t.Errorf("line %q does not match the contract", l)
		}
	}
	return code, lines
}

func TestKidsCheckPassesAGoodBandedLesson(t *testing.T) {
	code, lines := runKids(kidsRepoT(t, bandedOK, true))
	if code != 0 || len(lines) != 2 {
		t.Errorf("exit %d\n%s", code, strings.Join(lines, "\n"))
	}
}

func TestKidsCheckBlocksOnlyBandedLessons(t *testing.T) {
	long := strings.Replace(bandedOK, "A **neuron** is a tiny switch.", "A **neuron** is"+strings.Repeat(" a very", 12)+" tiny switch.", 1)
	code, lines := runKids(kidsRepoT(t, long, true))
	if code != 1 || !strings.Contains(strings.Join(lines, "\n"), "FAIL 3-nn.junior 8-11 section=s1 rule=long-sentence") {
		t.Errorf("banded: exit %d\n%s", code, strings.Join(lines, "\n"))
	}
	unbanded := strings.Replace(long, `"bands":true,`, "", 1)
	code, lines = runKids(kidsRepoT(t, unbanded, true))
	if code != 0 || !strings.Contains(strings.Join(lines, "\n"), "WARN 3-nn.junior 8-11 section=s1 rule=long-sentence") {
		t.Errorf("unbanded: exit %d\n%s", code, strings.Join(lines, "\n"))
	}
}

func TestKidsCheckNeedsARegisteredWordPicture(t *testing.T) {
	code, lines := runKids(kidsRepoT(t, bandedOK, false))
	if code != 1 || !strings.Contains(strings.Join(lines, "\n"), "rule=missing-visual") {
		t.Errorf("exit %d\n%s", code, strings.Join(lines, "\n"))
	}
}

// AC-61: an English Kids lesson change with the Hindi review left as it was fails the release gate.
func TestVerifyFailsWhenEnglishKidsLessonChangesAlone(t *testing.T) {
	root, dir := langRepo(t, "approved")
	writeFile(t, filepath.Join(root, "public-content", "lessons", "1-intro.junior.json"), `{"lessonId":"1-intro","mode":"junior","title":"Easier"}`)
	code, out := runVerify(dir)
	if code != 1 || !strings.Contains(out, "hi public-content/lang/hi/lessons/1-intro.junior.json") {
		t.Errorf("exit %d\n%s", code, out)
	}
}
