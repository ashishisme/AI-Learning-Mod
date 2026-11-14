// SPEC: FR-033, NFR-LIC-03; SPEC-013 FR-011, FR-012, SC-004
//
// Package ingest is the release check for the lesson files. Every lesson is written for this course
// and committed with the code; nothing is fetched. The package keeps the name it had when it imported
// the lessons, so the release commands did not have to change.
package ingest

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// Modes are the journeys every lesson is written for. Detailed is also the fallback the app serves.
var Modes = []string{"junior", "plain-english", "detailed"}

// LessonMeta is one row of the lesson list. Ids never change, so saved progress stays valid (FR-011).
type LessonMeta struct {
	ID     string `json:"id"`
	Module string `json:"module"`
	Title  string `json:"title"`
	Order  int    `json:"order"`
}

type LessonIndex struct {
	Lessons []LessonMeta `json:"lessons"`
}

func readIndex(dir string) (LessonIndex, error) {
	var index LessonIndex
	raw, err := os.ReadFile(filepath.Join(dir, "index.json"))
	if err != nil {
		return index, fmt.Errorf("no lesson index: %w", err)
	}
	if err := json.Unmarshal(raw, &index); err != nil {
		return index, fmt.Errorf("lesson index is invalid: %w", err)
	}
	return index, nil
}

// lessonHead reads the two fields the check needs from a lesson file.
func lessonHead(file string) (origin, title string, err error) {
	raw, err := os.ReadFile(file)
	if err != nil {
		return "", "", err
	}
	var l struct {
		Origin string `json:"origin"`
		Title  string `json:"title"`
	}
	if err := json.Unmarshal(raw, &l); err != nil {
		return "", "", fmt.Errorf("%s is invalid: %w", filepath.Base(file), err)
	}
	return l.Origin, l.Title, nil
}

// titled fails unless the list title is the start of the Detailed lesson's title. The list then shows
// only words the owner approved with that lesson, in every language.
func titled(l LessonMeta, detailedTitle string) error {
	if l.Title == "" || !strings.HasPrefix(detailedTitle, l.Title) {
		return fmt.Errorf("lesson %s is listed as %q, which is not the start of its Detailed title %q", l.ID, l.Title, detailedTitle)
	}
	return nil
}

// VerifyContent is the release gate for FR-033. It fails unless the content directory is complete and
// ours: an index, all three versions of every indexed lesson marked "origin": "own", no other lesson
// file, and for each translated index the same lessons with a translated Detailed version.
func VerifyContent(contentDir string) error {
	index, err := readIndex(contentDir)
	if err != nil {
		return err
	}
	if len(index.Lessons) == 0 {
		return errors.New("lesson index lists no lessons")
	}
	lessonsDir := filepath.Join(contentDir, "lessons")
	wanted := map[string]bool{}
	ids := map[string]bool{}
	for _, l := range index.Lessons {
		ids[l.ID] = true
		for _, mode := range Modes {
			name := l.ID + "." + mode + ".json"
			wanted[name] = true
			origin, title, err := lessonHead(filepath.Join(lessonsDir, name))
			if errors.Is(err, os.ErrNotExist) {
				return fmt.Errorf("lesson %s is in the index but has no %s file", l.ID, mode)
			} else if err != nil {
				return err
			}
			if origin != "own" {
				return fmt.Errorf("%s is not marked \"origin\": \"own\", so the owner's approval would not cover it", name)
			}
			if mode == "detailed" {
				if err := titled(l, title); err != nil {
					return err
				}
			}
		}
	}
	files, err := filepath.Glob(filepath.Join(lessonsDir, "*.json"))
	if err != nil {
		return err
	}
	for _, f := range files {
		if !wanted[filepath.Base(f)] {
			return fmt.Errorf("lessons/%s is not a version of a lesson in the index", filepath.Base(f))
		}
	}

	langDirs, err := filepath.Glob(filepath.Join(contentDir, "lang", "*"))
	if err != nil {
		return err
	}
	for _, dir := range langDirs {
		code := filepath.Base(dir)
		if _, err := os.Stat(filepath.Join(dir, "index.json")); errors.Is(err, os.ErrNotExist) {
			continue // no translated lesson list yet: the app shows the English one
		}
		translated, err := readIndex(dir)
		if err != nil {
			return fmt.Errorf("%s: %w", code, err)
		}
		if len(translated.Lessons) != len(index.Lessons) {
			return fmt.Errorf("%s: the lesson index lists %d lessons, English lists %d", code, len(translated.Lessons), len(index.Lessons))
		}
		for _, l := range translated.Lessons {
			if !ids[l.ID] {
				return fmt.Errorf("%s: lesson %s is not in the English index", code, l.ID)
			}
			_, title, err := lessonHead(filepath.Join(dir, "lessons", l.ID+".detailed.json"))
			if errors.Is(err, os.ErrNotExist) {
				return fmt.Errorf("%s: lesson %s is in the index but has no detailed file", code, l.ID)
			} else if err != nil {
				return fmt.Errorf("%s: %w", code, err)
			}
			if err := titled(l, title); err != nil {
				return fmt.Errorf("%s: %w", code, err)
			}
		}
	}
	return nil
}
