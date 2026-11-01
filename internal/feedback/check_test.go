// SPEC: FR-048, SC-018
package feedback

import (
	"strings"
	"testing"
)

func TestCheckRejectsPersonalDetails(t *testing.T) {
	cases := map[string][]string{
		KindEmail: {
			"mail me a.b@x.com please", "A.B@X.COM", "a b at gmail dot com", "name (at) gmail.com", "asha[at]yahoo dot in",
			"a . b @ g m a i l . c o m", "write to rahul_k at rediffmail dot com", "name＠gmail．com",
		},
		KindPhone: {
			"+91 98765 43210", "call 98765-43210", "9876543210", "(022) 2345 6789", "+1 415 555 0100",
			"9 8 7 6 5 4 3 2 1 0", "nine eight seven six five four three two one zero", "9.8.7.6.5.4.3.2.1.0",
			"my number is 98765​43210", "९८७६५४३२१०", "double nine eight seven six five four three two one",
			"919876543210", "555 0100 22",
		},
		KindAddress: {
			"12 MG Road Bengaluru 560001", "flat 4B Rose Apartments", "House no. 27 sector 9", "123 Main Street", "PIN 400001",
			"zip 94105", "plot 12 gandhi nagar", "I live at the blue house", "my house is near the park", "my address is near the park", "h.no 45", "door no 7",
			"pincode: 110001", "my home address", "27 Rose Garden Road", "sector 15",
		},
		KindIDNumber: {"1234 5678 9012", "ABCDE1234F", "4111 1111 1111 1111", "4111-1111-1111-1111", "aadhaar 2345 6789 0123"},
		KindDateOfBirth: {
			"my birthday is 4 May 2014", "born on 04/05/2014", "my dob: 12-03-2015", "I was born in 2014", "date of birth 3rd March 2013",
			"my birthday is march 4", "born on 2014-05-04",
		},
		KindLink: {
			"https://x.y", "see http://example.org/a", "www.x.y", "mysite.com", "my-school.in", "@asha_k", "follow @rahul.99 now",
			"add me on snapchat", "my insta is cool", "t.me/asha", "bit.ly/abc", "mysite.co.uk",
		},
	}
	for kind, msgs := range cases {
		for _, m := range msgs {
			got, found := Check(m)
			if !found {
				t.Errorf("not caught: %q (want %s)", m, kind)
			} else if got != kind {
				t.Errorf("%q: kind %s, want %s", m, got, kind)
			}
		}
	}
}

// Feedback about AI lessons is full of numbers. None of these may be refused.
func TestCheckPassesHarmlessFeedback(t *testing.T) {
	for _, m := range []string{
		"", "Lesson 2 was clear", "I got 10 out of 10 on 3 quizzes", "the 5 steps in lesson 1", "chapter 12 had 100 words",
		"the quiz took 15 minutes", "Great lesson! I loved the robot.", "GPT-4 and GPT-3.5 are different", "the answer to question 7 is wrong",
		"2 cars on the road in the picture", "the 3 road signs example", "5 ways AI affects society", "it stopped at 10:30 and 12:45",
		"pi is 3.14159265", "version 3.2.0 has a bug", "10 jobs in the health sector", "the code block 3 is confusing",
		"Look at this dot product", "I am at home right now", "what does dot mean in python", "Node.js is not in this lesson",
		"Turing was born in 1912", "one two three", "I live in a small town", "the door was open", "my house is big",
		"I want more of it. In the next lesson please", "e.g. a dog or a cat", "the 2nd lesson on the 4th day", "AT&T was mentioned",
		"This lesson is 100% better", "I scored 95 out of 100 and 80 out of 100", "mistake in step 4", "the street view picture",
	} {
		if kind, found := Check(m); found {
			t.Errorf("harmless message refused as %s: %q", kind, m)
		}
	}
}

func TestCheckNeverReturnsTheMatchedText(t *testing.T) {
	kind, found := Check("my phone is 9876543210")
	if !found || strings.Contains(kind, "98765") {
		t.Fatalf("%q %v", kind, found)
	}
	for _, k := range []string{KindEmail, KindPhone, KindAddress, KindIDNumber, KindDateOfBirth, KindLink} {
		if len(k) > 20 || strings.ContainsAny(k, "0123456789@") {
			t.Errorf("kind %q must be a fixed label", k)
		}
	}
}
