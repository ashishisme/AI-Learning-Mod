// SPEC: NFR-LIC-05, AC-57 (SPEC-011 FR-009 to FR-012)
//
// assetcheck is the release gate for product-owned art. Every file shipped under web/public/brand/
// must have an approved, trademark-clear entry in design/brand/asset-register.json whose recorded
// SHA-256 matches the file. Run from the repository root:
//
//	go run ./cmd/assetcheck
package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// File is one shipped derivative of an asset.
type File struct {
	Path   string `json:"path"` // relative to web/public/brand/
	SHA256 string `json:"sha256"`
}

// Asset is one register entry. Fields beyond these are recorded for people and kept as they are.
type Asset struct {
	ID              string `json:"id"`
	Status          string `json:"status"`          // draft | approved | retired
	TrademarkScreen string `json:"trademarkScreen"` // clear | needs-review | blocked
	AltKey          string `json:"altKey,omitempty"`
	Decorative      bool   `json:"decorative,omitempty"`
	ReleaseFiles    []File `json:"releaseFiles"`
}

// Register is design/brand/asset-register.json.
type Register struct {
	Assets []Asset `json:"assets"`
}

var allowedExt = map[string]bool{".svg": true, ".webp": true, ".avif": true, ".png": true}

func main() {
	root := flag.String("root", ".", "repository root")
	flag.Parse()
	problems, err := Check(*root)
	if err != nil {
		fmt.Fprintln(os.Stderr, "assetcheck:", err)
		os.Exit(2)
	}
	for _, p := range problems {
		fmt.Fprintln(os.Stderr, p)
	}
	if len(problems) > 0 {
		os.Exit(1)
	}
	fmt.Println("assetcheck: every shipped brand file is approved and matches the register")
}

// Check returns one line per problem, sorted, and an error only when the register cannot be read.
func Check(root string) ([]string, error) {
	raw, err := os.ReadFile(filepath.Join(root, "design", "brand", "asset-register.json"))
	if err != nil {
		return nil, err
	}
	var reg Register
	if err := json.Unmarshal(raw, &reg); err != nil {
		return nil, fmt.Errorf("asset-register.json: %w", err)
	}

	// What the register says may ship, keyed by file path.
	type entry struct {
		asset Asset
		sum   string
	}
	approved := map[string]entry{}
	var problems []string
	for _, a := range reg.Assets {
		if a.ID == "" {
			problems = append(problems, "register: an asset has no id")
			continue
		}
		if a.Status != "approved" {
			continue // drafts and retired assets may be recorded, but may not ship
		}
		if a.TrademarkScreen != "clear" {
			problems = append(problems, fmt.Sprintf("%s: approved but trademark screen is %q, not clear", a.ID, a.TrademarkScreen))
		}
		if a.AltKey == "" && !a.Decorative {
			problems = append(problems, fmt.Sprintf("%s: needs an altKey or decorative: true", a.ID))
		}
		for _, f := range a.ReleaseFiles {
			approved[filepath.ToSlash(f.Path)] = entry{a, strings.ToLower(f.SHA256)}
		}
	}

	brand := filepath.Join(root, "web", "public", "brand")
	err = filepath.WalkDir(brand, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			if os.IsNotExist(err) && p == brand {
				return filepath.SkipDir // nothing shipped yet
			}
			return err
		}
		if d.IsDir() || strings.HasPrefix(d.Name(), ".") {
			return nil
		}
		rel, _ := filepath.Rel(brand, p)
		rel = filepath.ToSlash(rel)
		if !allowedExt[strings.ToLower(filepath.Ext(rel))] {
			problems = append(problems, fmt.Sprintf("%s: file type not allowed (svg, webp, avif or png only)", rel))
			return nil
		}
		e, ok := approved[rel]
		if !ok {
			problems = append(problems, fmt.Sprintf("%s: no approved register entry", rel))
			return nil
		}
		sum, err := fileSHA256(p)
		if err != nil {
			return err
		}
		if sum != e.sum {
			problems = append(problems, fmt.Sprintf("%s: checksum %s does not match the register (%s, asset %s)", rel, sum, e.sum, e.asset.ID))
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	sort.Strings(problems)
	return problems, nil
}

func fileSHA256(p string) (string, error) {
	f, err := os.Open(p)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}
