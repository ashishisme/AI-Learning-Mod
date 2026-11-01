// SPEC: FR-014
// Command devidp runs a throwaway OpenID Connect provider for trying the admin sign-in locally.
// It approves every request. It must never be deployed.
package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"

	"ai-foundations-coach/internal/auth/fakeidp"
)

func main() {
	addr := flag.String("addr", "127.0.0.1:9100", "listen address")
	email := flag.String("email", "admin@example.org", "email the provider signs people in as")
	flag.Parse()

	issuer := "http://" + *addr
	idp := fakeidp.New(issuer, "dev", "dev", *email)
	idp.AMR = []string{"pwd", "mfa"}
	fmt.Printf("%s\n\nUse these server settings:\n  OIDC_ISSUER=%s\n  OIDC_CLIENT_ID=dev\n  OIDC_CLIENT_SECRET=dev\n  ADMIN_EMAILS=%s\n", idp, issuer, *email)
	log.Fatal(http.ListenAndServe(*addr, idp.Handler()))
}
