// SPEC: FR-015, FR-041..FR-046, FR-051, FR-052
package api

import (
	"errors"
	"net/http"
	"sort"
	"strconv"
	"time"

	"ai-foundations-coach/internal/auth"
	"ai-foundations-coach/internal/feedback"
	"ai-foundations-coach/internal/usage"
)

type activityBody struct {
	GeneratedAt   time.Time     `json:"generatedAt"`
	ActiveNow     int           `json:"activeNow"`
	ActiveLast24h int           `json:"activeLast24h"`
	ActiveLast7d  int           `json:"activeLast7d"`
	Inactive14d   int           `json:"inactive14d"`
	ByLabel       []labelCounts `json:"byLabel"`
}

type labelCounts struct {
	Label        string `json:"label"`
	Accounts     int    `json:"accounts"`
	ActiveLast7d int    `json:"activeLast7d"`
}

// activityNow works out who is active from all accounts. Revoked accounts are left out.
func (h *adminHandlers) activityNow(r *http.Request) (activityBody, error) {
	rows, _, err := h.svc.ListAccounts(r.Context(), auth.AccountFilter{})
	if err != nil {
		return activityBody{}, err
	}
	h.usage.Decorate(rows)
	now := time.Now().UTC()
	body := activityBody{GeneratedAt: now, ByLabel: []labelCounts{}}
	labels := map[string]*labelCounts{}
	for _, row := range rows {
		if row.Status == "revoked" {
			continue
		}
		lc := labels[row.Label]
		if lc == nil {
			lc = &labelCounts{Label: row.Label}
			labels[row.Label] = lc
		}
		lc.Accounts++
		if row.ActiveNow {
			body.ActiveNow++
		}
		seen := row.LastSeenAt != nil
		if seen && now.Sub(*row.LastSeenAt) <= 24*time.Hour {
			body.ActiveLast24h++
		}
		if seen && now.Sub(*row.LastSeenAt) <= 7*24*time.Hour {
			body.ActiveLast7d++
			lc.ActiveLast7d++
		}
		if row.Status == "active" && (!seen || now.Sub(*row.LastSeenAt) > 14*24*time.Hour) {
			body.Inactive14d++
		}
	}
	for _, lc := range labels {
		body.ByLabel = append(body.ByLabel, *lc)
	}
	sort.Slice(body.ByLabel, func(i, j int) bool { return body.ByLabel[i].Label < body.ByLabel[j].Label })
	return body, nil
}

func (h *adminHandlers) activity(w http.ResponseWriter, r *http.Request) {
	body, err := h.activityNow(r)
	if err != nil {
		h.fail(w, err)
		return
	}
	writeSecretJSON(w, body)
}

func (h *adminHandlers) overview(w http.ResponseWriter, r *http.Request) {
	d, err := h.svc.Dashboard(r.Context(), "")
	if err != nil {
		h.fail(w, err)
		return
	}
	act, err := h.activityNow(r)
	if err != nil {
		h.fail(w, err)
		return
	}
	snap, err := h.cost.Snapshot(r.Context())
	if err != nil {
		h.fail(w, err)
		return
	}
	unread := 0
	if h.fb != nil {
		if unread, err = h.fb.Unread(r.Context()); err != nil {
			h.fail(w, err)
			return
		}
	}
	writeSecretJSON(w, map[string]any{
		"generatedAt": act.GeneratedAt,
		"seats":       map[string]int{"used": d.SeatsUsed, "cap": d.SeatCap},
		"accounts":    map[string]int{"active": d.Active, "expired": d.Expired, "revoked": d.Revoked, "expiringIn7Days": d.ExpiringIn7Days},
		"invites":     map[string]int{"pending": d.PendingInvites},
		"activeNow":   act.ActiveNow, "activeLast24h": act.ActiveLast24h, "activeLast7d": act.ActiveLast7d,
		"ai": map[string]float64{"todayUSD": snap.AI.TodayUSD, "ceilingUSD": snap.AI.CeilingUSD,
			"monthToDateUSD": snap.AI.MonthToDateUSD, "budgetUSD": snap.AI.BudgetUSD},
		"feedback":     map[string]int{"unread": unread},
		"tutorEnabled": h.tutor,
	})
}

func (h *adminHandlers) usageReport(w http.ResponseWriter, r *http.Request) {
	days := 30
	switch r.URL.Query().Get("days") {
	case "", "30":
	case "7":
		days = 7
	default:
		writeAuthError(w, http.StatusBadRequest, "invalid", "days must be 7 or 30")
		return
	}
	rep, err := h.usage.Report(r.Context(), days)
	if err != nil {
		h.fail(w, err)
		return
	}
	writeSecretJSON(w, struct {
		GeneratedAt time.Time `json:"generatedAt"`
		usage.Report
	}{time.Now().UTC(), rep})
}

func (h *adminHandlers) costs(w http.ResponseWriter, r *http.Request) {
	snap, err := h.cost.Snapshot(r.Context())
	if err != nil {
		h.fail(w, err)
		return
	}
	if h.latch != nil {
		if snap.TutorOff, err = h.latch.Off(r.Context()); err != nil {
			h.fail(w, err)
			return
		}
	}
	writeSecretJSON(w, snap)
}

// resetTutor is the authorized manual reset of the budget switch (FR-026).
func (h *adminHandlers) resetTutor(w http.ResponseWriter, r *http.Request) {
	if err := h.latch.Reset(r.Context(), adminEmail(r.Context())); err != nil {
		h.fail(w, err)
		return
	}
	writeSecretJSON(w, map[string]bool{"ok": true})
}

// ---- feedback inbox: only items that passed both checks are ever returned (FR-051, SC-019)

func feedbackFilter(r *http.Request) feedback.Filter {
	q := r.URL.Query()
	rating, _ := strconv.Atoi(q.Get("rating"))
	return feedback.Filter{Status: q.Get("status"), Category: q.Get("category"), LessonID: q.Get("lessonId"), Label: q.Get("label"),
		Rating: rating, Limit: intParam(r, "limit", 100, 1, 500), Offset: intParam(r, "offset", 0, 0, 1_000_000)}
}

func (h *adminHandlers) feedbackFail(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, feedback.ErrNotFound):
		writeAuthError(w, http.StatusNotFound, "not_found", "Not found")
	case errors.Is(err, feedback.ErrInvalid):
		writeAuthError(w, http.StatusBadRequest, "invalid", "That request is not valid")
	default:
		writeAuthError(w, http.StatusServiceUnavailable, "unavailable", "Service temporarily unavailable")
	}
}

func (h *adminHandlers) feedbackList(w http.ResponseWriter, r *http.Request) {
	items, total, unread, held, err := h.fb.List(r.Context(), feedbackFilter(r))
	if err != nil {
		h.feedbackFail(w, err)
		return
	}
	writeSecretJSON(w, map[string]any{"items": items, "total": total, "unread": unread, "held": held})
}

func (h *adminHandlers) feedbackCSV(w http.ResponseWriter, r *http.Request) {
	f := feedbackFilter(r)
	f.Limit, f.Offset = 0, 0
	raw, err := h.fb.CSV(r.Context(), adminEmail(r.Context()), f)
	if err != nil {
		h.feedbackFail(w, err)
		return
	}
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="feedback.csv"`)
	w.Header().Set("Cache-Control", "no-store")
	_, _ = w.Write(raw)
}

func (h *adminHandlers) feedbackStatus(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Status string `json:"status"`
	}
	if !decodeBody(w, r, &in) {
		return
	}
	if err := h.fb.SetStatus(r.Context(), adminEmail(r.Context()), r.PathValue("id"), in.Status); err != nil {
		h.feedbackFail(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *adminHandlers) feedbackDelete(w http.ResponseWriter, r *http.Request) {
	if err := h.fb.Delete(r.Context(), adminEmail(r.Context()), r.PathValue("id")); err != nil {
		h.feedbackFail(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
