// SPEC: SPEC-009 FR-001, FR-003, FR-018, FR-028; data-model "Language"

// Package i18n knows which interface languages this release offers. English is always offered.
// Other languages come from public-content/languages.json and are offered only when "approved".
package i18n

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
)

// English is the reference language. It is implicit and always approved.
var English = Language{Code: "en", Name: "English", SpeechLang: "en-US", Status: StatusApproved}

const (
	StatusHidden   = "hidden"
	StatusApproved = "approved"
)

var codeRe = regexp.MustCompile(`^[a-z]{2,3}$`)

// Language is one entry of languages.json.
type Language struct {
	Code       string `json:"code"`
	Name       string `json:"name"`
	SpeechLang string `json:"speechLang"`
	Status     string `json:"status"`
}

// Set is the loaded language list. A nil *Set behaves as English only.
type Set struct {
	all []Language // English first, then file order
}

// Load reads <contentDir>/languages.json. A missing file means English only.
func Load(contentDir string) (*Set, error) {
	data, err := os.ReadFile(filepath.Join(contentDir, "languages.json"))
	if errors.Is(err, os.ErrNotExist) {
		return &Set{all: []Language{English}}, nil
	}
	if err != nil {
		return nil, err
	}
	var file struct {
		Languages []Language `json:"languages"`
	}
	if err := json.Unmarshal(data, &file); err != nil {
		return nil, fmt.Errorf("languages.json: %w", err)
	}
	set := &Set{all: []Language{English}}
	seen := map[string]bool{English.Code: true}
	for _, l := range file.Languages {
		switch {
		case !codeRe.MatchString(l.Code):
			return nil, fmt.Errorf("languages.json: invalid code %q", l.Code)
		case seen[l.Code]:
			return nil, fmt.Errorf("languages.json: %q listed twice or reserved", l.Code)
		case l.Name == "" || l.SpeechLang == "":
			return nil, fmt.Errorf("languages.json: %q needs a name and speechLang", l.Code)
		case l.Status != StatusHidden && l.Status != StatusApproved:
			return nil, fmt.Errorf("languages.json: %q has status %q, want hidden or approved", l.Code, l.Status)
		}
		seen[l.Code] = true
		set.all = append(set.all, l)
	}
	return set, nil
}

// All returns every listed language, hidden ones included (for the release gate).
func (s *Set) All() []Language {
	if s == nil {
		return []Language{English}
	}
	return s.all
}

// Approved returns the languages offered to learners, English first.
func (s *Set) Approved() []Language {
	var out []Language
	for _, l := range s.All() {
		if l.Status == StatusApproved {
			out = append(out, l)
		}
	}
	return out
}

// Lookup returns an approved language by code.
func (s *Set) Lookup(code string) (Language, bool) {
	for _, l := range s.Approved() {
		if l.Code == code {
			return l, true
		}
	}
	return Language{}, false
}

// Resolve maps a requested code to an approved one, or "en". The result is safe to use in a path.
func (s *Set) Resolve(code string) string {
	if l, ok := s.Lookup(code); ok {
		return l.Code
	}
	return English.Code
}
