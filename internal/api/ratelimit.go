// SPEC: NFR-SEC-06
package api

import (
	"encoding/json"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	RateLimitLimit      = 10
	RateLimitWindow     = 1 * time.Minute
	RateLimitRetryAfter = 60
	MaxTrackedHosts     = 10000 // Bounded memory per NFR-SEC-06
)

type rateLimitEntry struct {
	timestamps []time.Time
}

type RateLimiter struct {
	mu      sync.Mutex
	hosts   map[string]*rateLimitEntry
	limit   int
	window  time.Duration
	maxSize int
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		hosts:   make(map[string]*rateLimitEntry),
		limit:   limit,
		window:  window,
		maxSize: MaxTrackedHosts,
	}
}

func (rl *RateLimiter) Allow(host string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-rl.window)

	entry, exists := rl.hosts[host]
	if !exists {
		// Enforce bounded memory: evict if exceeding maxSize
		if len(rl.hosts) >= rl.maxSize {
			for k, v := range rl.hosts {
				if len(v.timestamps) == 0 || v.timestamps[len(v.timestamps)-1].Before(cutoff) {
					delete(rl.hosts, k)
				}
			}
			if len(rl.hosts) >= rl.maxSize {
				// Random delete one to stay strictly bounded
				for k := range rl.hosts {
					delete(rl.hosts, k)
					break
				}
			}
		}
		entry = &rateLimitEntry{}
		rl.hosts[host] = entry
	}

	// Filter timestamps within window
	valid := entry.timestamps[:0]
	for _, t := range entry.timestamps {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}
	entry.timestamps = valid

	if len(entry.timestamps) >= rl.limit {
		return false
	}

	entry.timestamps = append(entry.timestamps, now)
	return true
}

func extractHost(r *http.Request) string {
	remote := r.RemoteAddr
	host, _, err := net.SplitHostPort(remote)
	if err == nil {
		return strings.TrimSpace(host)
	}
	return strings.TrimSpace(remote)
}

func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		host := extractHost(r)
		if !rl.Allow(host) {
			w.Header().Set("Retry-After", strconv.Itoa(RateLimitRetryAfter))
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"error": "rate limit exceeded",
			})
			return
		}
		next.ServeHTTP(w, r)
	})
}
