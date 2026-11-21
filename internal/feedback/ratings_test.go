// SPEC: FR-I18N-13: one rating set per learner, overwritten on resubmit, kept while the account exists.
package feedback

import (
	"errors"
	"testing"
	"time"

	"ai-foundations-coach/internal/state"
)

func TestRatingsAreOnePerLearnerAndOverwritten(t *testing.T) {
	s, _, _ := newSvc(t)
	if err := s.SaveRatings(bg, "BETA-A", Ratings{Lessons: 4, Ease: 5, Voice: 3, Translation: 2, Lang: "ta"}); err != nil {
		t.Fatal(err)
	}
	if err := s.SaveRatings(bg, "BETA-A", Ratings{Lessons: 5, Ease: 4}); err != nil { // overwrite: voice and translation cleared
		t.Fatal(err)
	}
	if r, _ := s.MyRatings(bg, "BETA-A"); r != (Ratings{Lessons: 5, Ease: 4}) {
		t.Errorf("after overwrite: %+v", r)
	}
	_ = s.SaveRatings(bg, "BETA-B", Ratings{Lessons: 3, Voice: 4, Translation: 5, Lang: "kn"})
	sum, err := s.RatingsSummary(bg)
	if err != nil {
		t.Fatal(err)
	}
	if sum.Learners != 2 || sum.Areas["lessons"].Count != 2 || sum.Areas["lessons"].Average != 4 || sum.Areas["translation"].ByLang["kn"].Count != 1 {
		t.Errorf("summary: %+v lessons=%+v", sum, sum.Areas["lessons"])
	}
}

func TestRatingsValidation(t *testing.T) {
	s, _, _ := newSvc(t)
	for name, r := range map[string]Ratings{
		"nothing rated":           {},
		"six stars":               {Lessons: 6},
		"negative":                {Ease: -1},
		"translation no language": {Translation: 3},
		"translation in English":  {Translation: 3, Lang: "en"},
		"bad language":            {Translation: 3, Lang: "../x"},
	} {
		if err := s.SaveRatings(bg, "BETA-A", r); !errors.Is(err, ErrInvalid) {
			t.Errorf("%s: %v", name, err)
		}
	}
}

func TestRatingsAreDeletedWithTheAccount(t *testing.T) {
	s, st, now := newSvc(t)
	_ = st.Do(bg, func(tx state.Tx) error { tx.PutAccount(state.Account{BetaID: "BETA-KEEP"}); return nil })
	_ = s.SaveRatings(bg, "BETA-KEEP", Ratings{Lessons: 4})
	_ = s.SaveRatings(bg, "BETA-GONE", Ratings{Lessons: 2})
	if err := s.Sweep(bg, now.Add(time.Hour)); err != nil {
		t.Fatal(err)
	}
	if r, _ := s.MyRatings(bg, "BETA-KEEP"); r.Lessons != 4 {
		t.Error("ratings of a live account must stay")
	}
	if r, _ := s.MyRatings(bg, "BETA-GONE"); r.Lessons != 0 {
		t.Error("ratings of a deleted account must go")
	}
}

func TestWrittenFeedbackWithoutAnAuditorGoesStraightToTheInbox(t *testing.T) {
	_, st, _ := newSvc(t)
	s := NewService(st, nil)
	in := clean
	in.Rating = 0
	if err := s.Submit(bg, "BETA-A", "", in); err != nil {
		t.Fatal(err)
	}
	if items, total, _, _, _ := s.List(bg, Filter{}); total != 1 || items[0].Message != clean.Message {
		t.Errorf("inbox: %v", items)
	}
}
