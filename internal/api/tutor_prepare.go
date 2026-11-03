// SPEC: SPEC-008 FR-021a, FR-REV-20, FR-TUT-02, FR-TUT-04
package api

import (
	"encoding/json"
	"net/http"

	"ai-foundations-coach/internal/i18n"
	"ai-foundations-coach/internal/usage"
)

// LocalLessonBytes caps lesson context for a learner's own model, matching the local-model path.
const LocalLessonBytes = 3000

type promptMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// TutorPrepareResponse is either a safety reply to show as-is, or the prompt for the learner's
// own model plus the citation to append and the fallback for an empty or too-short answer.
type TutorPrepareResponse struct {
	SafetyReply string          `json:"safetyReply,omitempty"`
	Messages    []promptMessage `json:"messages,omitempty"`
	MaxTokens   int             `json:"maxTokens,omitempty"`
	Citation    string          `json:"citation,omitempty"`
	Fallback    string          `json:"fallback,omitempty"`
	Error       string          `json:"error,omitempty"`
}

// TutorPrepareHandler serves POST /api/tutor/prepare on a hosted server (FR-021a). The learner's
// browser sends the returned prompt to an AI on their own computer, so this handler never calls
// a model, spends nothing and is available even when the hosted tutor is off.
func TutorPrepareHandler(contentDir string, counter *usage.Recorder, langs *i18n.Set) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		req, tone, status, msg := decodeTutorRequest(r)
		if status != 0 {
			w.WriteHeader(status)
			_ = json.NewEncoder(w).Encode(TutorPrepareResponse{Error: msg})
			return
		}
		counter.Inc(usage.TutorQ) // a count only: the question itself is never recorded
		language := tutorLanguage(langs, req.Lang)

		// FR-REV-20: the same screen as the hosted tutor, before any prompt leaves the server.
		if cat := ScreenQuestion(req.Question); cat != SafetyNone {
			_ = json.NewEncoder(w).Encode(TutorPrepareResponse{SafetyReply: i18n.SafetyReply(language.Code, string(cat))})
			return
		}
		p, status, msg := loadTutorPrompt(contentDir, req, tone, LocalLessonBytes, true, language)
		if status != 0 {
			w.WriteHeader(status)
			_ = json.NewEncoder(w).Encode(TutorPrepareResponse{Error: msg})
			return
		}
		_ = json.NewEncoder(w).Encode(TutorPrepareResponse{
			Messages:  []promptMessage{{Role: "system", Content: p.system}, {Role: "user", Content: p.user}},
			MaxTokens: MaxCompletionTokens,
			Citation:  p.citation(),
			Fallback:  i18n.UncitedFallback(language.Code),
		})
	}
}
