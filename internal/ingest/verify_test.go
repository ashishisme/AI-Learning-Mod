// SPEC: FR-033, NFR-LIC-03, SC-014
package ingest

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"image"
	"image/color"
	"image/gif"
	"image/jpeg"
	"image/png"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// A real one-pixel PNG, and its name as a content hash.
var (
	goodPNG   = onePixelPNG()
	goodAsset = assetNameOf(goodPNG, ".png")
)

func onePixelPNG() []byte {
	var buf bytes.Buffer
	if err := png.Encode(&buf, image.NewRGBA(image.Rect(0, 0, 1, 1))); err != nil {
		panic(err)
	}
	return buf.Bytes()
}

func assetNameOf(data []byte, ext string) string {
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:])[:32] + ext
}

func writeContent(t *testing.T, markdown string) string {
	t.Helper()
	dir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dir, "lessons"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(dir, AssetDir), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, AssetDir, goodAsset), goodPNG, 0o644); err != nil {
		t.Fatal(err)
	}
	index, _ := json.Marshal(LessonIndex{CommitSHA: "abc", Lessons: []LessonMeta{{ID: "1-intro"}}})
	if err := os.WriteFile(filepath.Join(dir, "index.json"), index, 0o644); err != nil {
		t.Fatal(err)
	}
	lesson, _ := json.Marshal(Lesson{Blocks: []Block{{Type: "markdown", Content: markdown}}})
	if err := os.WriteFile(filepath.Join(dir, "lessons", "1-intro.json"), lesson, 0o644); err != nil {
		t.Fatal(err)
	}
	return dir
}

func TestVerifyContentAcceptsASelfContainedRelease(t *testing.T) {
	dir := writeContent(t, "# Intro\n![a](/lesson-assets/"+goodAsset+")\n[upstream doc](https://raw.githubusercontent.com/o/r/s/a.md)")
	if err := VerifyContent(dir); err != nil {
		t.Errorf("links to upstream are navigation and must pass: %v", err)
	}
}

func TestVerifyContentRefusesAnIncompleteRelease(t *testing.T) {
	cases := map[string]string{
		"remote image":    "![a](https://raw.githubusercontent.com/o/r/s/a.png)",
		"other host":      "![a](https://example.org/a.png)",
		"html image":      `<img src="https://example.org/a.png">`,
		"relative image":  "![a](images/a.png)",
		"missing bundled": "![a](/lesson-assets/ffffffffffffffffffffffffffffffff.png)",
		"traversal":       "![a](/lesson-assets/../../secret.png)",
	}
	for name, md := range cases {
		t.Run(name, func(t *testing.T) {
			if err := VerifyContent(writeContent(t, md)); err == nil {
				t.Errorf("%q must be refused", md)
			}
		})
	}
	t.Run("no index", func(t *testing.T) {
		if err := VerifyContent(t.TempDir()); err == nil {
			t.Error("a clean checkout without generated lessons must fail")
		}
	})
	t.Run("indexed lesson missing", func(t *testing.T) {
		dir := writeContent(t, "# Intro")
		_ = os.Remove(filepath.Join(dir, "lessons", "1-intro.json"))
		if err := VerifyContent(dir); err == nil || !strings.Contains(err.Error(), "1-intro") {
			t.Errorf("got %v", err)
		}
	})
}

func TestImageBundleDownloadsOnceAndKeepsOtherURLs(t *testing.T) {
	calls := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		if r.URL.Path != "/o/r/s/a.PNG" {
			t.Errorf("fetched %s", r.URL.Path)
		}
		_, _ = w.Write(goodPNG)
	}))
	defer srv.Close()
	b := &imageBundle{client: srv.Client(), rawHost: srv.URL, byURL: map[string]string{}, files: map[string][]byte{}}
	src := upstreamRawHost + "o/r/s/a.PNG"
	in := "![x](" + src + ` "Title")` + " and ![y](" + src + ") and ![z](https://example.org/z.png) [doc](" + upstreamRawHost + "o/r/s/d.md)"
	out, err := b.bundle(context.Background(), in)
	if err != nil {
		t.Fatal(err)
	}
	if calls != 1 || len(b.files) != 1 {
		t.Errorf("downloads %d, files %d, want 1 and 1", calls, len(b.files))
	}
	for name := range b.files {
		if !AssetNameRe.MatchString(name) || !strings.HasSuffix(name, ".png") {
			t.Errorf("name %q", name)
		}
		if !strings.Contains(out, "![x]("+AssetURLPrefix+name+` "Title")`) || !strings.Contains(out, "![y]("+AssetURLPrefix+name+")") {
			t.Errorf("rewrite: %s", out)
		}
	}
	if !strings.Contains(out, "https://example.org/z.png") || !strings.Contains(out, "[doc]("+upstreamRawHost+"o/r/s/d.md)") {
		t.Errorf("other URLs and links must be left alone: %s", out)
	}
}

// Every way a bundled file can look fine by name and still be a broken picture.
func TestVerifyContentRefusesImagesThatAreNotReallyImages(t *testing.T) {
	truncated := goodPNG[:len(goodPNG)-10]
	htmlPage := []byte("<!doctype html><html><body>404</body></html>")
	cases := map[string]struct {
		data []byte
		ext  string
		lie  bool // keep a name whose hash does not match the bytes
	}{
		"html saved as png": {data: htmlPage, ext: ".png"},
		"truncated png":     {data: truncated, ext: ".png"},
		"empty png":         {data: []byte{}, ext: ".png"},
		"png named jpg":     {data: goodPNG, ext: ".jpg"},
		"html saved as gif": {data: htmlPage, ext: ".gif"},
		"html saved as svg": {data: htmlPage, ext: ".svg"},
		"fake webp":         {data: htmlPage, ext: ".webp"},
		"replaced content":  {data: htmlPage, ext: ".png", lie: true},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			asset := assetNameOf(tc.data, tc.ext)
			if tc.lie {
				asset = goodAsset
			}
			dir := writeContent(t, "![a](/lesson-assets/"+asset+")")
			if err := os.WriteFile(filepath.Join(dir, AssetDir, asset), tc.data, 0o644); err != nil {
				t.Fatal(err)
			}
			if err := VerifyContent(dir); err == nil {
				t.Error("a broken image must fail the release check")
			}
		})
	}
}

func TestCheckImageAcceptsRealImages(t *testing.T) {
	var jpg, anim bytes.Buffer
	if err := jpeg.Encode(&jpg, image.NewRGBA(image.Rect(0, 0, 1, 1)), nil); err != nil {
		t.Fatal(err)
	}
	frame := image.NewPaletted(image.Rect(0, 0, 1, 1), color.Palette{color.Black, color.White})
	if err := gif.EncodeAll(&anim, &gif.GIF{Image: []*image.Paletted{frame, frame}, Delay: []int{1, 1}}); err != nil {
		t.Fatal(err)
	}
	for ext, data := range map[string][]byte{
		".png": goodPNG, ".jpg": jpg.Bytes(), ".jpeg": jpg.Bytes(), ".gif": anim.Bytes(),
		".svg":  []byte(`<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>`),
		".webp": []byte("RIFF\x00\x00\x00\x00WEBPVP8 "),
	} {
		if err := checkImage(ext, data); err != nil {
			t.Errorf("%s: %v", ext, err)
		}
	}
}

// A download that returns an error page with status 200 must stop the run, not ship.
func TestImageBundleRefusesADownloadThatIsNotAnImage(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("<html>rate limited</html>"))
	}))
	defer srv.Close()
	b := &imageBundle{client: srv.Client(), rawHost: srv.URL, byURL: map[string]string{}, files: map[string][]byte{}}
	if _, err := b.bundle(context.Background(), "![a]("+upstreamRawHost+"o/r/s/a.png)"); err == nil {
		t.Error("an HTML page must not be accepted as an image")
	}
}

// NFR-LIC-02: an image with a Microsoft logo is left out of the lesson, along with its credit line,
// and the release gate refuses it however it got there.
func TestBrandedImagesAreLeftOutAndRefused(t *testing.T) {
	branded := append(append([]byte{}, goodPNG...), []byte("logo")...) // still decodes: PNG ignores trailing bytes
	hash := contentHash(branded)
	brandedImages[hash] = "test logo"
	defer delete(brandedImages, hash)

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write(branded) }))
	defer srv.Close()
	b := &imageBundle{client: srv.Client(), rawHost: srv.URL, byURL: map[string]string{}, files: map[string][]byte{}}
	src := upstreamRawHost + "o/r/s/logo.png"
	out, err := b.bundle(context.Background(), "# Title\n\n![Summary]("+src+")\n\n> Sketchnote by [Artist](https://example.org)\n\nBody <img src=\""+src+"\"> text")
	if err != nil {
		t.Fatal(err)
	}
	if len(b.files) != 0 {
		t.Error("a branded image must not be bundled")
	}
	if out != "# Title\n\n\nBody  text" {
		t.Errorf("image, marker and credit must all go: %q", out)
	}

	for name, md := range map[string]string{"referenced": "![a](/lesson-assets/" + hash + ".png)", "unreferenced": "# Intro"} {
		t.Run(name, func(t *testing.T) {
			dir := writeContent(t, md)
			if err := os.WriteFile(filepath.Join(dir, AssetDir, hash+".png"), branded, 0o644); err != nil {
				t.Fatal(err)
			}
			if err := VerifyContent(dir); err == nil || !strings.Contains(err.Error(), "NFR-LIC-02") {
				t.Errorf("got %v", err)
			}
		})
	}
}

func TestImageBundleFailsTheRunRatherThanShippingABrokenImage(t *testing.T) {
	srv := httptest.NewServer(http.NotFoundHandler())
	defer srv.Close()
	b := &imageBundle{client: srv.Client(), rawHost: srv.URL, byURL: map[string]string{}, files: map[string][]byte{}}
	if _, err := b.bundle(context.Background(), "![a]("+upstreamRawHost+"o/r/s/a.png)"); err == nil {
		t.Error("a missing upstream image must fail the run")
	}
	if _, err := b.bundle(context.Background(), "![a]("+upstreamRawHost+"o/r/s/a.exe)"); err == nil {
		t.Error("a type that is not an image must fail the run")
	}
}
