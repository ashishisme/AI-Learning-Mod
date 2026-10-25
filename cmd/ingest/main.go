// SPEC: FR-ING-01, FR-ING-02, FR-ING-03, FR-ING-04, FR-ING-05, FR-ING-06, FR-ING-07, FR-ING-08, NFR-SEC-09, DC-03, DC-07
package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/google/go-github/v66/github"
)

const (
	RepoOwner = "microsoft"
	RepoName  = "AI-For-Beginners"
	MaxBlobSize = 5 * 1024 * 1024 // 5 MiB cap per NFR-SEC-09
	EgressTimeout = 30 * time.Second // 30s per NFR-SEC-09
)

type Config struct {
	GitHubToken string
	ContentDir  string
	BaseURL     string // optional override for testing
	RawBaseURL  string // optional override for testing
	Client      *http.Client
}

type LessonMeta struct {
	ID        string `json:"id"`
	Module    string `json:"module"`
	Title     string `json:"title"`
	Order     int    `json:"order"`
	Path      string `json:"path"`
	CommitSHA string `json:"commitSha"`
	ColabURL  string `json:"colabUrl,omitempty"`
}

type Block struct {
	Type    string `json:"type"`
	Content string `json:"content,omitempty"`
	Lang    string `json:"lang,omitempty"`
	Src     string `json:"src,omitempty"`
	Alt     string `json:"alt,omitempty"`
	Raw     any    `json:"raw,omitempty"`
}

type Lesson struct {
	LessonMeta
	Blocks []Block `json:"blocks"`
}

type LessonIndex struct {
	CommitSHA string       `json:"commitSha"`
	Lessons   []LessonMeta `json:"lessons"`
}

var (
	// Matches upstream lessons like "1-Introduction/README.md" or "lessons/1-Intro/README.md"
	lessonRegex = regexp.MustCompile(`^(?:lessons/)?(\d+[-_][\w-]+)/README\.md$`)
	// Strip javascript: in href/src
	jsSchemeRegex = regexp.MustCompile(`(?i)(href|src)\s*=\s*["']\s*javascript:[^"']*["']`)
	// Markdown images: ![alt](url)
	mdImageRegex = regexp.MustCompile(`!\[([^\]]*)\]\(([^)]+)\)`)
	// Markdown links: [text](url)
	mdLinkRegex = regexp.MustCompile(`\[([^\]]+)\]\(([^)]+)\)`)
	// HTML img: <img ... src="url" ...>
	htmlImgRegex = regexp.MustCompile(`(?i)<img\s+([^>]*?)src=["']([^"']+)["']([^>]*)>`)
)

func main() {
	token := os.Getenv("GITHUB_TOKEN")
	if strings.TrimSpace(token) == "" {
		slog.Error("GITHUB_TOKEN environment variable is required")
		os.Exit(1)
	}

	contentDir := os.Getenv("CONTENT_DIR")
	if strings.TrimSpace(contentDir) == "" {
		contentDir = "public-content"
	}

	cfg := Config{
		GitHubToken: token,
		ContentDir:  contentDir,
	}

	ctx := context.Background()
	if err := Run(ctx, cfg); err != nil {
		slog.Error("Ingestion failed", "error", err.Error())
		os.Exit(1)
	}
	slog.Info("Ingestion completed successfully", "contentDir", contentDir)
}

func Run(ctx context.Context, cfg Config) error {
	if strings.TrimSpace(cfg.GitHubToken) == "" {
		return errors.New("GITHUB_TOKEN is missing")
	}
	if cfg.ContentDir == "" {
		cfg.ContentDir = "public-content"
	}

	client := cfg.Client
	if client == nil {
		client = newEgressClient()
	}

	ghClient := github.NewClient(client).WithAuthToken(cfg.GitHubToken)
	if cfg.BaseURL != "" {
		u, err := url.Parse(cfg.BaseURL)
		if err != nil {
			return fmt.Errorf("invalid BaseURL: %w", err)
		}
		ghClient.BaseURL = u
	}

	// FR-ING-01: fetch current main branch commit SHA
	branch, resp, err := ghClient.Repositories.GetBranch(ctx, RepoOwner, RepoName, "main", 0)
	if err != nil {
		if resp != nil && resp.StatusCode >= 400 && resp.StatusCode < 500 {
			return fmt.Errorf("GitHub API returned client error %d: %w", resp.StatusCode, err)
		}
		return fmt.Errorf("failed to fetch main branch: %w", err)
	}
	if branch.Commit == nil || branch.Commit.SHA == nil {
		return errors.New("main branch commit SHA not found")
	}
	pinnedSHA := *branch.Commit.SHA
	slog.Info("Pinned upstream commit SHA", "sha", pinnedSHA)

	// Fetch Git Tree recursively
	tree, resp, err := ghClient.Git.GetTree(ctx, RepoOwner, RepoName, pinnedSHA, true)
	if err != nil {
		if resp != nil && resp.StatusCode >= 400 && resp.StatusCode < 500 {
			return fmt.Errorf("GitHub API tree error %d: %w", resp.StatusCode, err)
		}
		return fmt.Errorf("failed to fetch git tree: %w", err)
	}

	type matchItem struct {
		folder     string
		readmePath string
		notebooks  []string
	}
	matches := make(map[string]*matchItem)

	for _, entry := range tree.Entries {
		if entry.Path == nil {
			continue
		}
		p := *entry.Path

		// Exclude translations (FR-ING-02)
		if strings.HasPrefix(p, "translations/") {
			continue
		}

		// Check for lesson README
		if m := lessonRegex.FindStringSubmatch(p); m != nil {
			folder := m[1]
			if _, exists := matches[folder]; !exists {
				matches[folder] = &matchItem{folder: folder, readmePath: p}
			} else {
				matches[folder].readmePath = p
			}
		}

		// Check for notebooks (.ipynb) in lesson folders
		if strings.HasSuffix(p, ".ipynb") {
			dir := path.Dir(p)
			folderName := path.Base(dir)
			if m := lessonRegex.FindStringSubmatch(dir + "/README.md"); m != nil {
				folderName = m[1]
			}
			if item, exists := matches[folderName]; exists {
				item.notebooks = append(item.notebooks, p)
			}
		}
	}

	// Sort folders naturally / by lesson number
	type lessonCandidate struct {
		folder     string
		readmePath string
		num        int
		notebooks  []string
	}
	var candidates []lessonCandidate
	for folder, item := range matches {
		num := 9999
		parts := strings.Split(folder, "-")
		if n, err := strconv.Atoi(parts[0]); err == nil {
			num = n
		}
		candidates = append(candidates, lessonCandidate{
			folder:     folder,
			readmePath: item.readmePath,
			num:        num,
			notebooks:  item.notebooks,
		})
	}
	sort.Slice(candidates, func(i, j int) bool {
		if candidates[i].num != candidates[j].num {
			return candidates[i].num < candidates[j].num
		}
		return candidates[i].folder < candidates[j].folder
	})

	var lessons []LessonMeta
	rawHost := "https://raw.githubusercontent.com"
	if cfg.RawBaseURL != "" {
		rawHost = strings.TrimRight(cfg.RawBaseURL, "/")
	}

	// Ensure output directories exist
	lessonsDir := filepath.Join(cfg.ContentDir, "lessons")
	if err := os.MkdirAll(lessonsDir, 0755); err != nil {
		return fmt.Errorf("failed to create lessons directory: %w", err)
	}

	for order, cand := range candidates {
		// FR-ING-03: Derivations
		// id = lowercase folder segment (valid identifier)
		id := strings.ToLower(cand.folder)
		regID := regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,63}$`)
		if !regID.MatchString(id) {
			id = regexp.MustCompile(`[^a-z0-9_-]`).ReplaceAllString(id, "-")
		}

		// module derivation: second and third hyphen segments
		parts := strings.Split(cand.folder, "-")
		module := "general"
		if len(parts) >= 3 {
			module = strings.ToLower(parts[1] + "-" + parts[2])
		} else if len(parts) >= 2 {
			module = strings.ToLower(parts[1])
		}

		// Fetch raw Markdown (FR-ING-02)
		rawURL := fmt.Sprintf("%s/%s/%s/%s/%s", rawHost, RepoOwner, RepoName, pinnedSHA, cand.readmePath)
		rawMD, err := fetchWithRetry(ctx, client, rawURL)
		if err != nil {
			return fmt.Errorf("failed to fetch %s: %w", rawURL, err)
		}

		// FR-ING-06: strip javascript: href/src
		cleanMD := jsSchemeRegex.ReplaceAllString(string(rawMD), `$1=""`)

		// FR-ING-05: rewrite relative images and links
		lessonDir := path.Dir(cand.readmePath)
		cleanMD = rewriteRelativeAssets(cleanMD, RepoOwner, RepoName, pinnedSHA, lessonDir, "https://raw.githubusercontent.com")

		// FR-ING-03: title = first # heading, else title-cased id
		title := extractTitle(cleanMD, id)

		// Colab URL derivation if notebook exists
		colabURL := ""
		if len(cand.notebooks) > 0 {
			sort.Strings(cand.notebooks)
			colabURL = fmt.Sprintf("https://colab.research.google.com/github/%s/%s/blob/main/%s", RepoOwner, RepoName, cand.notebooks[0])
		}

		meta := LessonMeta{
			ID:        id,
			Module:    module,
			Title:     title,
			Order:     order,
			Path:      cand.readmePath,
			CommitSHA: pinnedSHA,
			ColabURL:  colabURL,
		}

		// FR-ING-08: Exactly one markdown block
		lessonObj := Lesson{
			LessonMeta: meta,
			Blocks: []Block{
				{
					Type:    "markdown",
					Content: cleanMD,
				},
			},
		}

		// Write public-content/lessons/<id>.json
		lessonFile := filepath.Join(lessonsDir, id+".json")
		data, err := json.MarshalIndent(lessonObj, "", "  ")
		if err != nil {
			return fmt.Errorf("failed to marshal lesson %s: %w", id, err)
		}
		if err := os.WriteFile(lessonFile, data, 0644); err != nil {
			return fmt.Errorf("failed to write lesson %s: %w", id, err)
		}

		lessons = append(lessons, meta)
	}

	// Write public-content/index.json (FR-ING-04, §6.1)
	indexObj := LessonIndex{
		CommitSHA: pinnedSHA,
		Lessons:   lessons,
	}
	indexData, err := json.MarshalIndent(indexObj, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal index: %w", err)
	}
	indexFile := filepath.Join(cfg.ContentDir, "index.json")
	if err := os.WriteFile(indexFile, indexData, 0644); err != nil {
		return fmt.Errorf("failed to write index file: %w", err)
	}

	return nil
}

func extractTitle(md, defaultID string) string {
	lines := strings.Split(md, "\n")
	for _, l := range lines {
		trimmed := strings.TrimSpace(l)
		if strings.HasPrefix(trimmed, "# ") {
			t := strings.TrimSpace(strings.TrimPrefix(trimmed, "# "))
			if t != "" {
				return t
			}
		}
	}
	words := strings.Fields(strings.ReplaceAll(defaultID, "-", " "))
	for i, w := range words {
		if len(w) > 0 {
			words[i] = strings.ToUpper(w[:1]) + strings.ToLower(w[1:])
		}
	}
	return strings.Join(words, " ")
}

func rewriteRelativeAssets(content, owner, repo, sha, baseDir, rawHost string) string {
	rawPrefix := fmt.Sprintf("%s/%s/%s/%s/", rawHost, owner, repo, sha)

	resolve := func(target string) string {
		target = strings.TrimSpace(target)
		if strings.HasPrefix(target, "http://") || strings.HasPrefix(target, "https://") || strings.HasPrefix(target, "data:") || strings.HasPrefix(target, "#") {
			return target
		}
		resolved := path.Clean(path.Join(baseDir, target))
		return rawPrefix + strings.TrimPrefix(resolved, "/")
	}

	// Markdown images: ![alt](url)
	content = mdImageRegex.ReplaceAllStringFunc(content, func(m string) string {
		sub := mdImageRegex.FindStringSubmatch(m)
		if len(sub) == 3 {
			return fmt.Sprintf("![%s](%s)", sub[1], resolve(sub[2]))
		}
		return m
	})

	// HTML <img> tags
	content = htmlImgRegex.ReplaceAllStringFunc(content, func(m string) string {
		sub := htmlImgRegex.FindStringSubmatch(m)
		if len(sub) == 4 {
			return fmt.Sprintf("<img %ssrc=\"%s\"%s>", sub[1], resolve(sub[2]), sub[3])
		}
		return m
	})

	// Markdown links pointing to relative images or documents
	content = mdLinkRegex.ReplaceAllStringFunc(content, func(m string) string {
		sub := mdLinkRegex.FindStringSubmatch(m)
		if len(sub) == 3 {
			dest := sub[2]
			if !strings.HasPrefix(dest, "http://") && !strings.HasPrefix(dest, "https://") && !strings.HasPrefix(dest, "#") {
				return fmt.Sprintf("[%s](%s)", sub[1], resolve(dest))
			}
		}
		return m
	})

	return content
}

// NFR-SEC-09: Egress client restricted to api.github.com and raw.githubusercontent.com
func newEgressClient() *http.Client {
	return &http.Client{
		Timeout: EgressTimeout,
	}
}

func fetchWithRetry(ctx context.Context, client *http.Client, rawURL string) ([]byte, error) {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return nil, fmt.Errorf("invalid URL %s: %w", rawURL, err)
	}

	// Domain restriction per NFR-SEC-09 (unless testing via localhost)
	host := parsed.Hostname()
	if host != "raw.githubusercontent.com" && host != "api.github.com" && host != "127.0.0.1" && host != "localhost" {
		return nil, fmt.Errorf("egress domain disallowed: %s", host)
	}

	var lastErr error
	backoff := 50 * time.Millisecond

	for attempt := 0; attempt < 3; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
		if err != nil {
			return nil, err
		}

		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
			time.Sleep(backoff)
			backoff *= 2
			continue
		}

		// Fail fast on 4xx (NFR-SEC-09)
		if resp.StatusCode >= 400 && resp.StatusCode < 500 {
			resp.Body.Close()
			return nil, fmt.Errorf("HTTP 4xx client error: %d", resp.StatusCode)
		}

		// Retry on 5xx
		if resp.StatusCode >= 500 {
			resp.Body.Close()
			lastErr = fmt.Errorf("HTTP 5xx server error: %d", resp.StatusCode)
			time.Sleep(backoff)
			backoff *= 2
			continue
		}

		// Read with 5 MiB cap (NFR-SEC-09)
		limitedReader := io.LimitReader(resp.Body, MaxBlobSize+1)
		data, err := io.ReadAll(limitedReader)
		resp.Body.Close()
		if err != nil {
			lastErr = err
			time.Sleep(backoff)
			backoff *= 2
			continue
		}
		if len(data) > MaxBlobSize {
			return nil, fmt.Errorf("response exceeded 5 MiB cap")
		}

		return data, nil
	}

	return nil, fmt.Errorf("request failed after retries: %w", lastErr)
}
