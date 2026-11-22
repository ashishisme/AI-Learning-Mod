// SPEC: SPEC-009 FR-006, FR-009; contracts/http-api.md "lang parameter"
package api

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// langContent adds a Hindi index, a Hindi base lesson-1 and a Hindi junior lesson-1 to the test content.
func langContent(t *testing.T, status string) string {
	t.Helper()
	dir := setupTestContent(t)
	write := func(rel, body string) {
		p := filepath.Join(dir, rel)
		if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(p, []byte(body), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	write("languages.json", `{"languages":[{"code":"hi","name":"हिन्दी","speechLang":"hi-IN","status":"`+status+`"}]}`)
	write("lang/hi/index.json", `{"lessons":[{"id":"lesson-1","title":"पाठ 1"}]}`)
	write("lang/hi/lessons/lesson-1.detailed.json", `{"lessonId":"lesson-1","mode":"detailed","title":"पाठ 1","sections":[]}`)
	write("lang/hi/lessons/lesson-1.junior.json", `{"lessonId":"lesson-1","mode":"junior","title":"बच्चों के लिए पाठ 1"}`)
	write("lessons/lesson-1.junior.json", `{"lessonId":"lesson-1","mode":"junior","title":"Kids lesson 1"}`)
	write("secret.json", `{"title":"must never be served"}`)
	return dir
}

func getLang(t *testing.T, router http.Handler, url string) (int, string, string) {
	t.Helper()
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, url, nil))
	return rec.Code, rec.Header().Get("Content-Language"), rec.Body.String()
}

func TestLessonsServeApprovedLanguageWithEnglishFallback(t *testing.T) {
	router := NewRouter(RouterConfig{ContentDir: langContent(t, "approved")})
	for _, tc := range []struct {
		url, wantLang, wantIn string
	}{
		{"/api/lessons?lang=hi", "hi", "पाठ 1"},
		{"/api/lessons", "en", "Lesson 1 Title"},
		{"/api/lessons/lesson-1?lang=hi", "hi", "पाठ 1"},
		{"/api/lessons/lesson-1?lang=hi&mode=junior", "hi", "बच्चों के लिए"},
		// No plain-english file in either language: fall back to the Detailed lesson, Hindi first (SPEC-013).
		{"/api/lessons/lesson-1?lang=hi&mode=plain-english", "hi", "पाठ 1"},
		// No Hindi lesson-2 at all.
		{"/api/lessons/lesson-2?lang=hi", "en", "lesson-2"},
		{"/api/lessons/lesson-1?mode=junior", "en", "Kids lesson 1"},
	} {
		code, lang, body := getLang(t, router, tc.url)
		if code != http.StatusOK || lang != tc.wantLang || !strings.Contains(body, tc.wantIn) {
			t.Errorf("%s: %d lang=%q body=%.80q, want 200 lang=%q containing %q", tc.url, code, lang, body, tc.wantLang, tc.wantIn)
		}
	}
}

func TestLessonsIgnoreHiddenUnknownAndUnsafeLang(t *testing.T) {
	for _, status := range []string{"hidden", "approved"} {
		router := NewRouter(RouterConfig{ContentDir: langContent(t, status)})
		urls := []string{"/api/lessons/lesson-1?lang=zz", "/api/lessons/lesson-1?lang=HI", "/api/lessons/lesson-1?lang=../..", "/api/lessons/lesson-1?lang=hi/../.."}
		if status == "hidden" {
			urls = append(urls, "/api/lessons/lesson-1?lang=hi", "/api/lessons?lang=hi")
		}
		for _, url := range urls {
			code, lang, body := getLang(t, router, url)
			if code != http.StatusOK || lang != "en" || strings.Contains(body, "पाठ") || strings.Contains(body, "must never") {
				t.Errorf("%s (%s): %d lang=%q body=%.60q, want English", url, status, code, lang, body)
			}
		}
	}
}

func TestLessonLangKeepsExistingErrors(t *testing.T) {
	router := NewRouter(RouterConfig{ContentDir: langContent(t, "approved")})
	if code, _, _ := getLang(t, router, "/api/lessons/nope?lang=hi"); code != http.StatusNotFound {
		t.Errorf("unknown lesson: %d, want 404", code)
	}
	if code, _, _ := getLang(t, router, "/api/lessons/Bad!Id?lang=hi"); code != http.StatusBadRequest {
		t.Errorf("invalid id: %d, want 400", code)
	}
}
