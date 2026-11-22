//go:build windows

package state

type fileLock struct{}

// shortcut: no cross-process lock on Windows, upgrade when the server is ever run there.
func acquireLock(string) (*fileLock, error) { return &fileLock{}, nil }

func (*fileLock) release() {}
