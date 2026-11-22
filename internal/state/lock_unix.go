//go:build !windows

package state

import (
	"fmt"
	"os"
	"syscall"
)

type fileLock struct{ f *os.File }

// acquireLock takes an exclusive advisory lock so two processes cannot share one state file.
func acquireLock(path string) (*fileLock, error) {
	f, err := os.OpenFile(path, os.O_CREATE|os.O_RDWR, 0o600)
	if err != nil {
		return nil, fmt.Errorf("state: open lock file: %w", err)
	}
	if err := syscall.Flock(int(f.Fd()), syscall.LOCK_EX|syscall.LOCK_NB); err != nil {
		f.Close()
		return nil, fmt.Errorf("state: %s is in use by another process", path)
	}
	return &fileLock{f: f}, nil
}

func (l *fileLock) release() {
	if l != nil && l.f != nil {
		_ = syscall.Flock(int(l.f.Fd()), syscall.LOCK_UN)
		l.f.Close()
		l.f = nil
	}
}
