package netopt

import (
	"fmt"
	"net"
	"net/http"
	"syscall"
	"time"
)

// blockedNets lists address ranges a hosted server must never connect to: loopback, private,
// link-local (which includes the cloud metadata service at 169.254.169.254), carrier-grade NAT,
// multicast and other non-public space.
var blockedNets = func() []*net.IPNet {
	cidrs := []string{
		"0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8", "169.254.0.0/16",
		"172.16.0.0/12", "192.0.0.0/24", "192.168.0.0/16", "198.18.0.0/15",
		"224.0.0.0/4", "240.0.0.0/4",
		"::/128", "::1/128", "fc00::/7", "fe80::/10", "ff00::/8",
	}
	nets := make([]*net.IPNet, 0, len(cidrs))
	for _, c := range cidrs {
		_, n, err := net.ParseCIDR(c)
		if err != nil {
			panic(err)
		}
		nets = append(nets, n)
	}
	return nets
}()

// IsBlockedIP reports whether a hosted server must refuse to connect to ip.
func IsBlockedIP(ip net.IP) bool {
	if ip == nil {
		return true
	}
	if v4 := ip.To4(); v4 != nil {
		ip = v4 // also catches IPv4-mapped IPv6 such as ::ffff:169.254.169.254
	}
	for _, n := range blockedNets {
		if n.Contains(ip) {
			return true
		}
	}
	return false
}

// GuardedHTTPClient returns a client that refuses to connect to non-public addresses (FR-022).
// The check runs on the address actually being dialled, after DNS resolution and for every
// redirect, so DNS rebinding and redirects to internal hosts cannot get around it.
// Proxies are disabled because a proxy would connect on the client's behalf, past the check.
func GuardedHTTPClient(timeout time.Duration, insecure bool) *http.Client {
	c := HTTPClient(timeout, insecure)
	tr := c.Transport.(*http.Transport)
	tr.Proxy = nil
	dialer := &net.Dialer{
		Timeout: 10 * time.Second,
		Control: func(_, address string, _ syscall.RawConn) error {
			host, _, err := net.SplitHostPort(address)
			if err != nil {
				return err
			}
			if IsBlockedIP(net.ParseIP(host)) {
				return fmt.Errorf("connection to non-public address %s is not allowed", host)
			}
			return nil
		},
	}
	tr.DialContext = dialer.DialContext
	return c
}
