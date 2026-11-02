// SPEC: FR-026
package api

import (
	"encoding/base64"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strings"

	"ai-foundations-coach/internal/auth"
)

const budgetPushPath = "/api/internal/budget"

// BudgetPush authenticates budget notifications pushed by Pub/Sub.
type BudgetPush struct {
	Verifier       *auth.OIDC
	Audience       string
	ServiceAccount string
}

// registerBudgetPush adds the route only when it is configured, so an unconfigured server has no
// public endpoint that could switch the tutor off.
func registerBudgetPush(mux *http.ServeMux, cfg RouterConfig) {
	if cfg.BudgetPush == nil || cfg.TutorLatch == nil {
		return
	}
	push := cfg.BudgetPush
	mux.HandleFunc("POST "+budgetPushPath, func(w http.ResponseWriter, r *http.Request) {
		token, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
		if !ok || push.Verifier.VerifyPushToken(r.Context(), token, push.Audience, push.ServiceAccount) != nil {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		var envelope struct {
			Message struct {
				Data string `json:"data"`
			} `json:"message"`
		}
		var body struct {
			AlertThresholdExceeded float64 `json:"alertThresholdExceeded"`
		}
		raw, err := io.ReadAll(io.LimitReader(r.Body, 64<<10))
		if err == nil {
			err = json.Unmarshal(raw, &envelope)
		}
		var decoded []byte
		if err == nil {
			decoded, err = base64.StdEncoding.DecodeString(envelope.Message.Data)
		}
		if err == nil {
			err = json.Unmarshal(decoded, &body)
		}
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		if body.AlertThresholdExceeded >= 1 {
			if err := cfg.TutorLatch.Trip(r.Context(), "budget notification"); err != nil {
				slog.Error("Could not switch the tutor off", "error", err.Error())
				w.WriteHeader(http.StatusInternalServerError) // Pub/Sub delivers it again
				return
			}
		}
		w.WriteHeader(http.StatusNoContent)
	})
}
