// SPEC: DC-02, DC-07, DC-08, NFR-SEC-07, NFR-OPS-01, NFR-OPS-02, NFR-OPS-03
package main

import (
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"ai-foundations-coach/internal/api"
)

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

	handler := api.NewRouter(api.RouterConfig{
		ContentDir: contentDir,
		OpenAIKey:  openAIKey,
		StaticFS:   staticFS,
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
