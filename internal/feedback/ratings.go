// SPEC: FR-I18N-13 (SPEC-016 owner decision 2026-11-21). Star ratings are the first part of feedback: each
// learner has one set (1–5 stars per area), sending again overwrites it, and it is kept while the account
// exists. Ratings are counters keyed by a hash of the Beta ID, never the ID itself, and carry no text.
package feedback

import (
	"context"
	"regexp"
	"strconv"
	"strings"

	"ai-foundations-coach/internal/state"
)

const ratingPrefix = "fbr:" // fbr:<learner hash>:<area>[:<lang>] = 1..5

// RatingAreas are the areas a learner rates. "translation" is only for learners using another language.
var RatingAreas = []string{"lessons", "ease", "voice", "translation"}

// Ratings is one learner's saved stars; 0 means not rated.
type Ratings struct {
	Lessons     int    `json:"lessons"`
	Ease        int    `json:"ease"`
	Voice       int    `json:"voice"`
	Translation int    `json:"translation"`
	Lang        string `json:"lang,omitempty"` // the language the translation rating is about
}

func (r Ratings) byArea() map[string]int {
	return map[string]int{"lessons": r.Lessons, "ease": r.Ease, "voice": r.Voice, "translation": r.Translation}
}

var ratingLangRe = regexp.MustCompile(`^[a-z]{2,3}$`)

func (r Ratings) valid() bool {
	any := false
	for _, v := range r.byArea() {
		if v < 0 || v > 5 {
			return false
		}
		any = any || v > 0
	}
	if r.Translation > 0 && (!ratingLangRe.MatchString(r.Lang) || r.Lang == "en") {
		return false
	}
	return any
}

func ratingKeys(tx state.Tx, betaID string) map[string]int64 {
	return tx.ListCounters(ratingPrefix + learnerHash(betaID) + ":")
}

// SaveRatings replaces the learner's ratings (FR-I18N-13: a resubmit overwrites). It is not limited.
func (s *Service) SaveRatings(ctx context.Context, betaID string, r Ratings) error {
	if !r.valid() {
		return ErrInvalid
	}
	base := ratingPrefix + learnerHash(betaID) + ":"
	return s.store.Do(ctx, func(tx state.Tx) error {
		for k := range ratingKeys(tx, betaID) {
			tx.DeleteCounter(k)
		}
		for area, v := range r.byArea() {
			if v == 0 {
				continue
			}
			key := base + area
			if area == "translation" {
				key += ":" + r.Lang
			}
			tx.AddCounter(key, int64(v))
		}
		return nil
	})
}

// MyRatings returns the learner's saved ratings, so the form can show them.
func (s *Service) MyRatings(ctx context.Context, betaID string) (Ratings, error) {
	var r Ratings
	err := s.store.View(ctx, func(tx state.Tx) error {
		for k, v := range ratingKeys(tx, betaID) {
			parts := strings.Split(k, ":") // fbr, hash, area[, lang]
			switch parts[2] {
			case "lessons":
				r.Lessons = int(v)
			case "ease":
				r.Ease = int(v)
			case "voice":
				r.Voice = int(v)
			case "translation":
				r.Translation = int(v)
				if len(parts) > 3 {
					r.Lang = parts[3]
				}
			}
		}
		return nil
	})
	return r, err
}

// AreaSummary is the average and number of ratings for one area (or one language's translation).
type AreaSummary struct {
	Average float64                 `json:"average"`
	Count   int                     `json:"count"`
	Stars   [5]int                  `json:"stars"` // how many gave 1..5 stars
	ByLang  map[string]*AreaSummary `json:"byLang,omitempty"`
}

func (a *AreaSummary) add(v int64) {
	if v < 1 || v > 5 {
		return
	}
	a.Average = (a.Average*float64(a.Count) + float64(v)) / float64(a.Count+1)
	a.Count++
	a.Stars[v-1]++
}

// RatingsSummary is what an admin sees: per area, with translation split by language. No learner is named.
type RatingsSummary struct {
	Learners int                     `json:"learners"`
	Areas    map[string]*AreaSummary `json:"areas"`
}

func (s *Service) RatingsSummary(ctx context.Context) (RatingsSummary, error) {
	sum := RatingsSummary{Areas: map[string]*AreaSummary{}}
	for _, a := range RatingAreas {
		sum.Areas[a] = &AreaSummary{}
	}
	sum.Areas["translation"].ByLang = map[string]*AreaSummary{}
	err := s.store.View(ctx, func(tx state.Tx) error {
		learners := map[string]bool{}
		for k, v := range tx.ListCounters(ratingPrefix) {
			parts := strings.Split(k, ":")
			if len(parts) < 3 || sum.Areas[parts[2]] == nil {
				continue
			}
			learners[parts[1]] = true
			sum.Areas[parts[2]].add(v)
			if parts[2] == "translation" && len(parts) > 3 {
				l := sum.Areas["translation"].ByLang[parts[3]]
				if l == nil {
					l = &AreaSummary{}
					sum.Areas["translation"].ByLang[parts[3]] = l
				}
				l.add(v)
			}
		}
		sum.Learners = len(learners)
		return nil
	})
	for _, a := range sum.Areas { // two decimals is plenty and keeps the JSON tidy
		a.Average, _ = strconv.ParseFloat(strconv.FormatFloat(a.Average, 'f', 2, 64), 64)
	}
	return sum, err
}

// sweepRatings deletes ratings whose account no longer exists (kept while the account exists).
func sweepRatings(tx state.Tx) []string {
	live := map[string]bool{}
	for _, a := range tx.ListAccounts() {
		live[learnerHash(a.BetaID)] = true
	}
	var gone []string
	for k := range tx.ListCounters(ratingPrefix) {
		if parts := strings.Split(k, ":"); len(parts) > 1 && !live[parts[1]] {
			gone = append(gone, k)
		}
	}
	return gone
}
