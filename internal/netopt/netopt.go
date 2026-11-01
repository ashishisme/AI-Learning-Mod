// Package netopt builds outbound HTTP clients, including an explicit, opt-in way
// to skip TLS certificate verification (self-signed or corporate-proxy certificates).
//
// Skipping verification removes protection against man-in-the-middle attacks.
// It is OFF by default and must be enabled deliberately.
package netopt

import (
	"crypto/tls"
	"net/http"
	"os"
	"strconv"
	"time"
)

// EnvInsecureTLS enables insecure TLS for every outbound client this server creates
// (curriculum ingest and the AI endpoint). Example: INSECURE_SKIP_TLS_VERIFY=true
const EnvInsecureTLS = "INSECURE_SKIP_TLS_VERIFY"

// EnvInsecure reports whether the operator enabled insecure TLS server-wide.
func EnvInsecure() bool {
	v, err := strconv.ParseBool(os.Getenv(EnvInsecureTLS))
	return err == nil && v
}

// HTTPClient returns a client based on the default transport (so proxy settings,
// HTTP/2 and connection pooling are preserved). Certificate verification is skipped
// only when insecure is true. A zero timeout means no client-side timeout.
func HTTPClient(timeout time.Duration, insecure bool) *http.Client {
	tr := http.DefaultTransport.(*http.Transport).Clone()
	if insecure {
		tr.TLSClientConfig = &tls.Config{InsecureSkipVerify: true} // #nosec G402 -- explicit opt-in
	}
	return &http.Client{Timeout: timeout, Transport: tr}
}
