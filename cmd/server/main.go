// SPEC: DC-02, DC-07, DC-08, NFR-SEC-07, NFR-OPS-01, NFR-OPS-02, NFR-OPS-03
package main

import (
	"context"
	"io"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"ai-foundations-coach/internal/api"
	"ai-foundations-coach/internal/auth"
	"ai-foundations-coach/internal/cost"
	"ai-foundations-coach/internal/feedback"
	"ai-foundations-coach/internal/netopt"
	"ai-foundations-coach/internal/spend"
	"ai-foundations-coach/internal/state"
	"ai-foundations-coach/internal/usage"
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

// cloudLogHandler writes the JSON Cloud Logging reads, so severity and message are structured.
func cloudLogHandler() slog.Handler {
	return slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{ReplaceAttr: func(groups []string, a slog.Attr) slog.Attr {
		if len(groups) > 0 {
			return a
		}
		switch a.Key {
		case slog.LevelKey:
			a.Key = "severity"
		case slog.MessageKey:
			a.Key = "message"
		}
		return a
	}})
}

func main() {
	if os.Getenv("K_SERVICE") != "" {
		slog.SetDefault(slog.New(cloudLogHandler()))
	}
	port := os.Getenv("PORT")
	if strings.TrimSpace(port) == "" {
		port = "8080"
	}

	contentDir := os.Getenv("CONTENT_DIR")
	if strings.TrimSpace(contentDir) == "" {
		contentDir = "public-content"
	}

	openAIKey := os.Getenv("OPENAI_API_KEY")

	if netopt.EnvInsecure() {
		slog.Warn("INSECURE_SKIP_TLS_VERIFY is enabled: TLS certificates are NOT verified for curriculum ingest or the AI endpoint. Use only on trusted networks.")
	}

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

	// Deployment settings (SPEC-008). A bad or incomplete configuration stops the server with one
	// message listing everything wrong, instead of starting a server nobody can administer.
	appCfg, err := LoadConfig(os.Getenv)
	if err != nil {
		slog.Error(err.Error())
		os.Exit(1)
	}
	if appCfg.Hosted {
		slog.Info("Hosted mode: AI settings come from server configuration only; AI-config-test is disabled")
	}
	if !appCfg.TutorEnabled {
		slog.Info("The AI tutor is disabled (TUTOR_ENABLED is false)")
	}

	routerCfg := api.RouterConfig{
		ContentDir:       contentDir,
		OpenAIKey:        openAIKey,
		ModelClient:      modelClient,
		StaticFS:         staticFS,
		Hosted:           appCfg.Hosted,
		TrustedProxyHops: appCfg.TrustedProxyHops,
		TutorDisabled:    !appCfg.TutorEnabled,
		FeedbackEnabled:  appCfg.FeedbackEnabled,
		Release:          os.Getenv("RELEASE_TAG"),
	}

	var store state.Store
	if appCfg.AuthEnabled {
		store, err = openStore(appCfg)
		if err != nil {
			slog.Error("Cannot open the state store", "backend", appCfg.StateBackend, "error", err.Error())
			os.Exit(1)
		}
		signer, err := auth.NewSigner(appCfg.SessionSecret)
		if err != nil {
			slog.Error(err.Error())
			os.Exit(1)
		}
		authCfg := auth.DefaultConfig(appCfg.PublicBaseURL)
		authCfg.SeatCap = appCfg.SeatCap
		authCfg.LockoutKey = []byte("lockout:" + appCfg.SessionSecret) // the same on every instance
		routerCfg.Auth = auth.NewService(store, authCfg)
		routerCfg.Signer = signer
		routerCfg.Spend = spend.New(store, spend.Config{
			CeilingUSD: appCfg.DailyCeilingUSD, InputPerMtokUSD: appCfg.PriceInPerMtok, OutputPerMtokUSD: appCfg.PriceOutPerMtok,
		})
		routerCfg.Usage = usage.New(store)
		routerCfg.Cost = cost.NewProvider(routerCfg.Spend, appCfg.MonthlyBudgetUSD, nil)
		routerCfg.TutorLatch = spend.NewLatch(store, routerCfg.Spend, appCfg.MonthlyBudgetUSD)
		if appCfg.BudgetPushAudience != "" {
			routerCfg.BudgetPush = &api.BudgetPush{
				Verifier: auth.NewOIDC(auth.OIDCConfig{Issuer: "https://accounts.google.com"}),
				Audience: appCfg.BudgetPushAudience, ServiceAccount: appCfg.BudgetPushAccount,
			}
		}
		if appCfg.FeedbackEnabled {
			routerCfg.Feedback = feedback.NewService(store, feedback.NewModelAuditor(feedback.AuditorConfig{
				BaseURL: appCfg.AuditorBaseURL, APIKey: appCfg.AuditorAPIKey, KeyFile: appCfg.AuditorKeyFile, Model: appCfg.AuditorModel,
				Guarded: appCfg.Hosted, Tally: routerCfg.Spend,
			}))
			slog.Info("Feedback is on: messages are held until the AI auditor passes them", "model", appCfg.AuditorModel)
		} else if appCfg.AuditorKeyUnreadable {
			slog.Warn("Feedback is hidden: the auditor key file cannot be read")
		} else {
			slog.Info("Feedback is off: set FEEDBACK_AUDITOR_BASE_URL, FEEDBACK_AUDITOR_API_KEY or _FILE, and FEEDBACK_AUDITOR_MODEL to turn it on")
		}
		routerCfg.OIDC = auth.NewOIDC(auth.OIDCConfig{
			Issuer: appCfg.OIDCIssuer, ClientID: appCfg.OIDCClientID, ClientSecret: appCfg.OIDCClientSecret,
			RedirectURL: appCfg.PublicBaseURL + "/api/auth/admin/callback", RequireMFA: appCfg.OIDCRequireMFA, AdminEmails: appCfg.AdminEmails,
		})
		routerCfg.AdminEmails = appCfg.AdminEmails
		routerCfg.SecureCookies = strings.HasPrefix(appCfg.PublicBaseURL, "https://")
		slog.Info("Invite-only sign-in is on", "stateBackend", appCfg.StateBackend, "seatCap", appCfg.SeatCap)
		if appCfg.Hosted && appCfg.StateBackend == "file" {
			slog.Warn("Accounts live in a JSON file: run a single instance with a persistent volume at the state file's directory, or sign-ups and the seat cap are lost on restart", "stateFile", appCfg.StateFile)
		}
	}

	handler := api.NewRouter(routerCfg)

	// Hourly clean-up: accounts expired for more than 90 days, dead sessions, old invites (FR-039).
	sweepCtx, stopSweep := context.WithCancel(context.Background())
	defer stopSweep()
	if routerCfg.Auth != nil {
		routerCfg.Auth.AddSweepHook(routerCfg.Usage.Sweep)
		if routerCfg.Feedback != nil {
			routerCfg.Auth.AddSweepHook(routerCfg.Feedback.Sweep)
			go routerCfg.Feedback.Run(sweepCtx) // reviews only when something is waiting (FR-059)
		}
		// Usage counts reach the store every 30 seconds (FR-042 allows data up to a minute old).
		go func() {
			t := time.NewTicker(30 * time.Second)
			defer t.Stop()
			for {
				select {
				case <-t.C:
					if err := routerCfg.Usage.Flush(sweepCtx); err != nil && sweepCtx.Err() == nil {
						slog.Error("Could not save usage counts", "error", err.Error())
					}
				case <-sweepCtx.Done():
					return
				}
			}
		}()
		go func() {
			run := func() {
				if res, err := routerCfg.Auth.Sweep(sweepCtx); err != nil {
					slog.Error("Clean-up failed", "error", err.Error())
				} else if res.Accounts+res.Sessions+res.Invites > 0 {
					slog.Info("Clean-up removed old records", "accounts", res.Accounts, "sessions", res.Sessions, "invites", res.Invites)
				}
			}
			run()
			t := time.NewTicker(time.Hour)
			defer t.Stop()
			for {
				select {
				case <-t.C:
					run()
				case <-sweepCtx.Done():
					return
				}
			}
		}()
	}

	// NFR-SEC-07: Construct HTTP server with strict timeouts (expanded WriteTimeout to 300s for local CPU model streaming)
	server := &http.Server{
		Addr:              ":" + port,
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      300 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	// Finish in-flight requests (including streaming answers) when the platform scales down or
	// redeploys. Cloud Run sends SIGTERM and allows 10 seconds, so stop a little before that.
	stop, cancelSignals := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancelSignals()

	exitCode := 0
	serveErr := make(chan error, 1)
	go func() {
		slog.Info("Starting AI Foundations Coach server", "port", port, "contentDir", contentDir)
		serveErr <- server.ListenAndServe()
	}()

	select {
	case err := <-serveErr:
		if err != nil && err != http.ErrServerClosed {
			slog.Error("Server terminated unexpectedly", "error", err.Error())
			os.Exit(1)
		}
	case <-stop.Done():
		slog.Info("Shutdown signal received; draining in-flight requests")
		ctx, cancel := context.WithTimeout(context.Background(), shutdownDrain)
		defer cancel()
		if err := server.Shutdown(ctx); err != nil {
			// Not fatal yet: the usage counts below must still be saved.
			slog.Error("Graceful shutdown did not finish", "error", err.Error())
			_ = server.Close()
			exitCode = 1
		}
	}
	stopSweep()
	if store != nil {
		ctx, cancel := context.WithTimeout(context.Background(), shutdownFlush)
		defer cancel()
		if err := routerCfg.Usage.Flush(ctx); err != nil {
			slog.Error("Could not save usage counts on shutdown", "error", err.Error())
		}
		if err := store.Close(); err != nil {
			slog.Error("Could not close the state store on shutdown", "error", err.Error())
			exitCode = 1
		}
	}
	if exitCode != 0 {
		os.Exit(exitCode)
	}
}

// Cloud Run sends SIGTERM and kills the instance 10 seconds later, so draining and the final flush
// must together fit inside that.
const (
	shutdownDrain = 6 * time.Second
	shutdownFlush = 3 * time.Second
)

// openStore opens the configured backend. Firestore does one read first, so a revision that cannot
// reach its data exits here and never passes its startup probe.
func openStore(c AppConfig) (state.Store, error) {
	if c.StateBackend != "firestore" {
		return state.OpenFileStore(c.StateFile)
	}
	cfg := state.FirestoreConfig{ProjectID: c.FirestoreProject}
	if c.EmulatorHost != "" {
		cfg.BaseURL = "http://" + c.EmulatorHost
		cfg.Token = func(context.Context) (string, error) { return "owner", nil }
	}
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	return state.OpenFirestoreStore(ctx, cfg)
}
