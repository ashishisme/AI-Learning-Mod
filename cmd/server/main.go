// SPEC: DC-02, DC-07, DC-08, NFR-SEC-07, NFR-OPS-01, NFR-OPS-02, NFR-OPS-03
package main

import (
	"context"
	"io"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"ai-foundations-coach/internal/api"
	openai "github.com/sashabaranov/go-openai"
)

type demoStreamReceiver struct {
	tokens []string
	idx    int
}

func (d *demoStreamReceiver) Recv() (string, error) {
	if d.idx >= len(d.tokens) {
		return "", io.EOF
	}
	tok := d.tokens[d.idx]
	d.idx++
	time.Sleep(35 * time.Millisecond) // realistic streaming cadence
	return tok, nil
}

func (d *demoStreamReceiver) Close() {}

type demoModelClient struct{}

func (d *demoModelClient) CreateChatCompletion(ctx context.Context, req openai.ChatCompletionRequest) (openai.ChatCompletionResponse, error) {
	return openai.ChatCompletionResponse{
		Choices: []openai.ChatCompletionChoice{
			{
				Message: openai.ChatCompletionMessage{
					Content: "According to [Lesson § Architecture], machine learning models learn representation mappings directly from training datasets by iteratively optimizing loss functions.",
				},
			},
		},
	}, nil
}

func (d *demoModelClient) CreateChatCompletionStream(ctx context.Context, req openai.ChatCompletionRequest) (api.StreamReceiver, error) {
	sample := "According to [Lesson § Core Concepts], biological neurons receive electrical pulses through dendrites, whereas artificial neurons compute weighted numerical sums passed through non-linear activation functions like ReLU and Sigmoid to predict targets."
	words := strings.SplitAfter(sample, " ")
	return &demoStreamReceiver{tokens: words}, nil
}

func main() {
	port := os.Getenv("PORT")
	if strings.TrimSpace(port) == "" {
		port = "8080"
	}

	contentDir := os.Getenv("CONTENT_DIR")
	if strings.TrimSpace(contentDir) == "" {
		contentDir = "public-content"
	}

	openAIKey := os.Getenv("OPENAI_API_KEY")

	var staticFS fs.FS
	if info, err := os.Stat("web/dist"); err == nil && info.IsDir() {
		staticFS = os.DirFS("web/dist")
	}

	var modelClient api.ModelClient
	if strings.ToLower(os.Getenv("MOCK_TUTOR")) == "true" || openAIKey == "mock" {
		slog.Info("Running tutor in local demo simulation mode (MOCK_TUTOR=true)")
		modelClient = &demoModelClient{}
	} else if baseURL := os.Getenv("OPENAI_BASE_URL"); baseURL != "" {
		model := os.Getenv("OPENAI_MODEL")
		if model == "" {
			model = "llama3.2:1b"
		}
		if openAIKey == "" {
			openAIKey = "ollama"
		}
		slog.Info("Configured AI Tutor with local/custom LLM endpoint", "baseURL", baseURL, "model", model)
	}

	handler := api.NewRouter(api.RouterConfig{
		ContentDir:  contentDir,
		OpenAIKey:   openAIKey,
		ModelClient: modelClient,
		StaticFS:    staticFS,
	})

	// NFR-SEC-07: Construct HTTP server with strict timeouts
	server := &http.Server{
		Addr:              ":" + port,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      90 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	slog.Info("Starting AI Foundations Coach server", "port", port, "contentDir", contentDir)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error("Server terminated unexpectedly", "error", err.Error())
		os.Exit(1)
	}
}
