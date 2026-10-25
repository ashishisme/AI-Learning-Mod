// SPEC: FR-SET-01, FR-SET-02, FR-SET-03, FR-SET-04, NFR-SEC-03
package api

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	openai "github.com/sashabaranov/go-openai"
)

type ConfigTestRequest struct {
	BaseURL string `json:"baseUrl"`
	Model   string `json:"model"`
	APIKey  string `json:"apiKey"`
}

type ConfigTestResponse struct {
	OK          bool     `json:"ok"`
	LatencyMs   int64    `json:"latencyMs"`
	Error       string   `json:"error,omitempty"`
	Models      []string `json:"models,omitempty"`
	ActiveModel string   `json:"activeModel,omitempty"`
}

// ConfigTestHandler validates AI provider connectivity and discovers available models.
func ConfigTestHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "method not allowed"})
		return
	}

	var req ConfigTestRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 4096)).Decode(&req); err != nil && err != io.EOF {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(ConfigTestResponse{OK: false, Error: "invalid request payload"})
		return
	}

	baseURL := strings.TrimSpace(req.BaseURL)
	model := strings.TrimSpace(req.Model)
	apiKey := strings.TrimSpace(req.APIKey)

	if baseURL == "" {
		baseURL = "http://localhost:11434/v1"
	}
	if apiKey == "" {
		apiKey = "ollama"
	}
	if model == "" {
		model = "llama3.2:1b"
	}

	cfg := openai.DefaultConfig(apiKey)
	cfg.BaseURL = baseURL

	client := openai.NewClientWithConfig(cfg)
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	t0 := time.Now()

	// Perform a minimal 1-token completion to verify connectivity and model existence
	chatReq := openai.ChatCompletionRequest{
		Model: model,
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleUser, Content: "ping"},
		},
		MaxTokens: 1,
	}

	_, err := client.CreateChatCompletion(ctx, chatReq)
	latency := time.Since(t0).Milliseconds()

	var models []string
	// Attempt to query tags if baseURL points to Ollama
	if strings.Contains(baseURL, "11434") || strings.Contains(baseURL, "localhost") {
		// Ollama /api/tags
		tagsURL := strings.Replace(baseURL, "/v1", "/api/tags", 1)
		if !strings.HasSuffix(tagsURL, "/api/tags") {
			tagsURL = strings.TrimRight(baseURL, "/") + "/api/tags"
		}
		if reqTag, tagErr := http.NewRequestWithContext(ctx, http.MethodGet, tagsURL, nil); tagErr == nil {
			httpClient := &http.Client{Timeout: 3 * time.Second}
			if respTag, errResp := httpClient.Do(reqTag); errResp == nil {
				defer respTag.Body.Close()
				var tagResult struct {
					Models []struct {
						Name string `json:"name"`
					} `json:"models"`
				}
				if json.NewDecoder(respTag.Body).Decode(&tagResult) == nil {
					for _, m := range tagResult.Models {
						models = append(models, m.Name)
					}
				}
			}
		}
	}

	if len(models) == 0 {
		models = []string{model}
	}

	if err != nil {
		w.WriteHeader(http.StatusOK) // Return 200 with OK: false so UI gets detailed diagnostic
		_ = json.NewEncoder(w).Encode(ConfigTestResponse{
			OK:          false,
			LatencyMs:   latency,
			Error:       fmt.Sprintf("Connection failed: %v", err),
			Models:      models,
			ActiveModel: model,
		})
		return
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(ConfigTestResponse{
		OK:          true,
		LatencyMs:   latency,
		Models:      models,
		ActiveModel: model,
	})
}
