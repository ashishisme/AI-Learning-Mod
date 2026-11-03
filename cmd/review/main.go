// SPEC: SPEC-009 FR-017, FR-018, FR-019 (the review ledger), T050

// Command review lets a native-speaker reviewer see where each translated file stands and approve the
// files they have checked, without editing hashes by hand.
//
//	go run ./cmd/review -lang hi                                   # list every file and its status
//	go run ./cmd/review -lang hi -reviewer "Name" -approve <path>…  # approve the files you checked
//
// Approving records the current hashes of the file and its English source, the reviewer and today's
// date in content/review/<lang>.json. A file whose structure differs from English is refused. Any later
// change to the file or its source makes the approval stale, and the release gate reports it.
package main

import (
	"flag"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"ai-foundations-coach/internal/i18n"
)

func main() {
	os.Exit(run(".", os.Args[1:], time.Now, os.Stdout, os.Stderr))
}

func run(root string, args []string, now func() time.Time, stdout, stderr io.Writer) int {
	fs := flag.NewFlagSet("review", flag.ContinueOnError)
	fs.SetOutput(stderr)
	lang := fs.String("lang", "", "language code, for example hi")
	reviewer := fs.String("reviewer", "", "your name or handle, recorded with each approval (no contact details)")
	approve := fs.Bool("approve", false, "approve the files named after the flags (paths as -lang lists them)")
	if err := fs.Parse(args); err != nil {
		return 2
	}
	if *lang == "" || *lang == i18n.English.Code {
		fmt.Fprintln(stderr, "-lang must name a translated language, for example -lang hi")
		return 2
	}
	targets, err := i18n.Targets(root, *lang)
	if err != nil {
		fmt.Fprintln(stderr, err)
		return 2
	}
	ledger, err := i18n.LoadLedger(root, *lang)
	if err != nil {
		fmt.Fprintln(stderr, err)
		return 2
	}

	if !*approve {
		for _, t := range targets {
			fmt.Fprintf(stdout, "%-12s %-9s %s\n", status(root, t, ledger), t.Kind, t.Path)
		}
		return 0
	}

	if strings.TrimSpace(*reviewer) == "" {
		fmt.Fprintln(stderr, "-approve needs -reviewer \"Your Name\"")
		return 2
	}
	byPath := map[string]i18n.Target{}
	for _, t := range targets {
		byPath[t.Path] = t
	}
	paths := fs.Args()
	if len(paths) == 0 {
		fmt.Fprintln(stderr, "name the files to approve, as `-lang` lists them")
		return 2
	}
	failed := false
	for _, p := range paths {
		p = filepath.ToSlash(filepath.Clean(p))
		t, ok := byPath[p]
		if !ok {
			fmt.Fprintf(stderr, "%s: not a file this language needs\n", p)
			failed = true
			continue
		}
		file := filepath.Join(root, filepath.FromSlash(t.Path))
		if _, err := os.Stat(file); err != nil {
			fmt.Fprintf(stderr, "%s: not translated yet\n", p)
			failed = true
			continue
		}
		if problems := i18n.Parity(root, t); len(problems) > 0 {
			fmt.Fprintf(stderr, "%s: not approved, its structure differs from English:\n  %s\n", p, strings.Join(problems, "\n  "))
			failed = true
			continue
		}
		src, err1 := i18n.SourceHash(root, t)
		tr, err2 := i18n.HashFile(file)
		if err1 != nil || err2 != nil {
			fmt.Fprintf(stderr, "%s: %v %v\n", p, err1, err2)
			failed = true
			continue
		}
		ledger.Upsert(i18n.Entry{Path: t.Path, Kind: t.Kind, SourceHash: src, TranslationHash: tr})
		e := ledger.Find(t.Path)
		e.Status, e.Reviewer, e.Date = i18n.ReviewApproved, strings.TrimSpace(*reviewer), now().Format("2006-01-02")
		fmt.Fprintf(stdout, "approved  %s\n", p)
	}
	if err := ledger.Save(root); err != nil {
		fmt.Fprintln(stderr, err)
		return 1
	}
	if failed {
		return 1
	}
	return 0
}

// status is what the release gate would say about one file, in a word.
func status(root string, t i18n.Target, l *i18n.Ledger) string {
	file := filepath.Join(root, filepath.FromSlash(t.Path))
	if _, err := os.Stat(file); err != nil {
		return "missing"
	}
	e := l.Find(t.Path)
	switch {
	case e == nil:
		return "unrecorded"
	case e.Status != i18n.ReviewApproved:
		return "draft"
	}
	src, err1 := i18n.SourceHash(root, t)
	tr, err2 := i18n.HashFile(file)
	if err1 != nil || err2 != nil || src != e.SourceHash || tr != e.TranslationHash {
		return "stale"
	}
	return "approved"
}
