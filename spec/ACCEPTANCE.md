# Traceability Matrix — SPEC-001 v2.16.0

| AC | Requirement(s) | Test file | Status | Notes |
|---|---|---|---|---|
| AC-01 | FR-ING-01..04 | — | N/A (retired 2.15.0) | The lesson import is gone (SPEC-013 FR-013); AC-74 covers the lesson files |
| AC-02 | FR-ING-05, NFR-SEC-03 | — | N/A (retired 2.15.0) | No lesson is imported, so no image is bundled from another course |
| AC-03 | FR-ING-07 | — | N/A (retired 2.15.0) | No access token is used to build the lessons |
| AC-04 | FR-CNT-01, FR-CNT-02 | `internal/api/lessons_test.go::TestAC04_GetLessons` | PASS | GET /api/lessons and /api/lessons/{id} return conformant JSON |
| AC-05 | FR-CNT-03, FR-CNT-04 | `internal/api/lessons_test.go::TestAC05_PathTraversal` | PASS | Path traversal attempts return 400 or 404, no leak |
| AC-06 | FR-CNT-06 | `internal/api/lessons_test.go::TestAC06_CorruptedLesson` | PASS | Corrupted lesson yields 500 on that ID, 200 on others |
| AC-07 | FR-CNT-07, NFR-REL-01 | `internal/api/lessons_test.go::TestAC07_EmptyContentDir` | PASS | Empty content dir returns 503 on /api/lessons, /api/health still 200 |
| AC-08 | FR-TUT-01, FR-TUT-05, FR-TUT-06 | `internal/api/tutor_mode_test.go::TestAC08_CitationFiltering` | PASS | Cited text passes; uncited text replaced with fallback |
| AC-09 | FR-TUT-07, NFR-SEC-02 | `internal/api/tutor_mode_test.go::TestAC09_InputValidation` | PASS | Empty or >500 char question -> 400; >8KiB body -> 413; unknown field -> 400 |
| AC-10 | FR-TUT-08, NFR-REL-01 | `internal/api/tutor_mode_test.go::TestAC10_MissingAPIKey` | PASS | Without OPENAI_API_KEY, /api/tutor -> 503; other routes still 200 |
| AC-11 | FR-TUT-09 | `internal/api/tutor_mode_test.go::TestAC11_TutorTimeout` | PASS | Slow stub (>60s) produces 504 tutor timeout |
| AC-12 | NFR-AI-01, NFR-AI-03 | `internal/api/tutor_mode_test.go::TestAC12_PromptInjectionDefense` | PASS | Injection question produces answer without system prompt text |
| AC-13 | NFR-SEC-03 | `internal/api/middleware_test.go::TestAC13_SecurityHeaders` | PASS | Every response carries the 5 required security headers |
| AC-14 | NFR-SEC-06 | `internal/api/ratelimit_test.go::TestAC14_RateLimiting` | PASS | 11th /api/tutor request within a minute from one host -> 429 with Retry-After: 60 |
| AC-15 | NFR-SEC-08 | `internal/api/middleware_test.go::TestAC15_PanicRecovery` | PASS | Injected panic returns 500 without leaking request body |
| AC-16 | NFR-SEC-09 | — | N/A (retired 2.15.0) | Nothing is fetched to build the lessons |
| AC-17 | NFR-REL-02 | `internal/api/health_test.go::TestAC17_HealthExact` | PASS | /api/health returns exactly {"ok":true} |
| AC-18 | NFR-OPS-02 | `internal/api/routes_test.go::TestAC18_NoDebugEndpoints` | PASS | /pprof, /debug, /metrics are 404 |
| AC-19 | FR-UI-02, FR-PRG-03 | `web/tests/home.spec.ts::AC-19` | PASS | / lists lessons with done/total summary; marking complete updates it |
| AC-20 | FR-UI-03 | `web/tests/lesson.spec.ts::AC-20` | PASS | /lesson/:id renders title, back link, the lesson sections, Colab button, tutor panel |
| AC-21 | FR-UI-04, NFR-SEC-05 | `web/tests/security.spec.ts::AC-21` | PASS | A <script> or onerror tag in lesson text shows as text; no element is created and no alert fires |
| AC-22 | FR-PRG-01, FR-PRG-02 | `web/tests/progress.spec.ts::AC-22` | PASS | Progress persists across reload via localStorage, zero server transmission |
| AC-23 | FR-UI-06 | `web/tests/errors.spec.ts::AC-23` | PASS | With /api/lessons returning 503, / shows the "lessons are missing" message |
| AC-24 | FR-UI-07 | `web/tests/tutor.spec.ts::AC-24` | PASS | With /api/tutor returning 503, tutor panel shows "Tutor offline" and disabled input |
| AC-25 | FR-UI-05 | `web/tests/quiz.spec.ts::AC-25` | PASS | /quiz/:id renders placeholder linking to / |
| AC-26 | NFR-LIC-01 | `web/tests/attribution.spec.ts::AC-26` | PASS | The footer appears on /, /lesson/:id and /quiz/:id, names the maker and no other course |
| AC-27 | NFR-SEC-05 | Static check: `! grep -R "dangerouslySetInnerHTML" web/src` | PASS | dangerouslySetInnerHTML does not appear anywhere in web/src |
| AC-28 | NFR-OPS-02 | Static check: `! grep -R "net/http/pprof" .` | PASS | net/http/pprof does not appear anywhere in repository |
| AC-29 | DC-02, DC-03, DC-04, DC-06 | Static check: `go mod graph` allowlist | PASS | go mod graph shows only allowed modules and transitive dependencies |
| AC-30 | NFR-LIC-03, NFR-SEC-01 | Git check: `! git ls-files \| grep -E '^(\.env\|public-content\|web/dist\|web/node_modules\|bin/)' \| grep -vE '^(\.env\.example\|public-content/languages\.json\|public-content/(lang/[a-z-]+/)?index\.json\|public-content/(lang/[a-z-]+/)?lessons/[^/]+\.(junior\|plain-english\|detailed)\.json)$'` | PASS (2026-11-14) | No secrets or build artifacts in git. The lessons, the lesson lists, `languages.json` and `.env.example` are source and exempt (O6, T123, SPEC 2.8.1; lists added 2.15.0) |
| AC-31 | NFR-OPS-01 | Docker check: `docker run --rm ai-foundations-coach id -u` | PASS | Dockerfile configured with non-root UID 10001 (host docker CLI not installed) |
| AC-32 | DC-02 | Build check: `go vet ./... && go build ./... && cd web && npx tsc --noEmit && npm run build` | PASS | Backend and frontend compile cleanly without errors |
| AC-33 | FR-TUT-11, FR-UI-12 | `internal/api/tutor_mode_test.go::TestAC33_StreamingTutor` | PASS | POST /api/tutor with Accept: text/event-stream returns chunked SSE tokens and [DONE] |
| AC-34 | FR-SET-01..04, FR-UI-14 | `internal/api/config_test.go::TestAC34_ConfigTest`, `web/tests/settings.spec.ts::AC-34` | PASS | Settings drawer opens globally, configures AI/model/tokens, tests connection, overrides tutor |
| AC-35 | FR-QZ-01..04, FR-UI-13 | `web/tests/quiz.spec.ts::AC-35`, `web/tests/home.spec.ts::AC-35` | PASS | Interactive quiz engine with immediate rationale, AI hint, scored recap; / search filtering |
| AC-36 | FR-UI-15 | `web/tests/theme.spec.ts::AC-36` | PASS | Dark/Light theme toggle updates document class and persists in localStorage |
| AC-37 | FR-ING-09, FR-SET-05 | `internal/api/spa_fallback_test.go::TestUnknownAPIPathIsJSON404NotIndexHTML`, `web/tests/cloud-hardening.spec.ts` | PASS | Sync removed 2026-11-02: the route returns a JSON 404 and Settings has no sync or GitHub token controls |
| AC-38 | FR-TUT-13 | `internal/api/tutor_mode_test.go::TestAC38_CustomProviderAutoCitation` | PASS | Custom-provider uncited long streamed answers get an appended citation; short ones get the FR-TUT-06 fallback |
| AC-39 | FR-001..FR-006 | `internal/api/auth_handlers_test.go`, `web/tests/auth.spec.ts` | PASS | Signed-out gate, activation and sign-in |
| AC-40 | FR-003, FR-004 | `internal/auth/service_activate_test.go`, `web/tests/auth.spec.ts` | PASS | One-use invite and one-time credential display |
| AC-41 | FR-035..FR-038 | `internal/api/abuse_test.go`, `internal/auth/service_login_test.go` | PASS | Lockout and session validation |
| AC-42 | FR-018..FR-022 | `internal/api/expiry_handlers_test.go`, `web/tests/expiry.spec.ts` | PASS | Expiry, warning and admin extension |
| AC-43 | FR-024, FR-025 | `internal/api/hosted_test.go`, `web/tests/tutor-disabled.spec.ts` | PASS | Hosted tutor defaults off; runtime hides controls |
| AC-44 | FR-026..FR-028 | `internal/spend/tally_test.go`, `internal/api/abuse_test.go` | PASS | Daily spend reservations prevent overshoot |
| AC-45 | FR-041..FR-046 | `internal/api/admin_insights_test.go`, `web/tests/admin-insights.spec.ts` | PASS | Overview, usage, activity and honest cost reporting |
| AC-46 | FR-047..FR-059 | `internal/feedback/*_test.go`, `internal/api/feedback_handlers_test.go`, `web/tests/feedback.spec.ts` | PASS | Rule check, AI audit, inbox and retention |
| AC-47 | FR-I18N-01, FR-I18N-02, FR-I18N-03 | `internal/api/lessons_lang_test.go`, `internal/i18n/languages_test.go`, `internal/api/hosted_test.go::TestRuntimeListsApprovedLanguages`, `web/tests/i18n-foundation.spec.ts` | PASS | SPEC-009 B1: English text unchanged after moving to catalogues; `?lang=` allowlist with per-file fallback; runtime lists approved languages |
| AC-48 | FR-I18N-04, FR-I18N-05 | `internal/i18n/ledger_test.go`, `internal/i18n/parity_test.go`, `cmd/ingest/verify_lang_test.go`, `cmd/translate/translate_test.go`, `internal/feedback/check_hi_test.go`, `internal/api/safety_hi_test.go`, `internal/api/feedback_lang_test.go`, `web/tests/feedback.spec.ts` | PASS | SPEC-009 B2: Hindi ingest and release gate (approved fails, hidden warns); translator drafts with glossary and structure check; Hindi and Hinglish personal-details and safety rules; localised rejection |
| AC-49 | FR-I18N-06 | `web/tests/i18n.spec.ts` | N/A (pending T049/T050) | SPEC-009 B3: switcher, persistence, first-visit rule, not-translated notice and quiz fallback pass; the SC-001 no-English-left and 360 px checks skip until the reviewed Hindi catalogue exists |
| AC-50 | FR-I18N-07, FR-I18N-08 | `internal/narration/text_test.go`, `cmd/narrate/narrate_test.go`, `internal/api/audio_test.go`, `cmd/ingest/verify_lang_test.go`, `web/tests/narration-hi.spec.ts` | N/A (recordings pending T055, T049) | SPEC-009 B4: device voice in the text's language or none; recorder, cache, gate and player with fakes. Real Hindi recordings wait for gcloud sign-in, the Hindi drafts (T049) and the voice listening test (T055) |
| AC-51 | FR-I18N-09, FR-TUT-06 (amended) | `internal/api/tutor_lang_test.go`, `web/tests/cloud-hardening.spec.ts` | PASS | SPEC-009 B5: tutor in the learner's approved language (prompt, citation, fallback, safety), English for anything else; app sends lang and listens in hi-IN. Constitution II amended 2.4.0, ratified by the owner 2026-11-03 |
| AC-52 | FR-I18N-10 | `cmd/ingest/verify_lang_test.go::TestVerifyBetaLanguageMayLaunchOnDeviceVoices`, `web/tests/i18n.spec.ts` | PASS | SPEC-009 owner beta exception 2026-11-03: Hindi launched owner-approved before native review and recordings; recordings warn only; menu labels it beta |
| AC-53 | SPEC-008 FR-021a, FR-034 (CSP) | `internal/api/tutor_prepare_test.go`, `web/tests/cloud-hardening.spec.ts` | PASS (automated); real browsers pending T129 | Hosted learner's own local AI: `POST /api/tutor/prepare` needs a session, applies validation, rate limit and safety screen, makes no model call; the browser calls only localhost or 127.0.0.1 |
| AC-54 | FR-UI-16 | `web/tests/journey-store.spec.ts`, `web/tests/journey-switch.spec.ts` | PASS | SPEC-011: first-time three-journey chooser; saved modes kept |
| AC-55 | FR-UI-17 | `web/tests/redesign-a11y.spec.ts` | PASS | SPEC-011: Kids layer scoped to junior; 4.5:1 contrast in every journey and theme |
| AC-56 | FR-UI-18 | `web/tests/kids-home.spec.ts` | PASS | SPEC-011: Chip's Trail Kids home |
| AC-57 | NFR-LIC-05 | `cmd/assetcheck/assetcheck_test.go` | PASS (automated) | SPEC-011: product art has approved, trademark-clear register entries and matching checksums; underlying reviewer/search evidence referenced by T028 |
| AC-58 | NFR-OPS-05 | `specs/011-kids-ui-overhaul/checklists/perf-review.md` | PASS | SPEC-011: measured page weight and load time meet budget; owner chose to keep current assets on 2026-11-06 |
| AC-59 | FR-UI-19 | `web/tests/audio-mute.spec.ts` | PASS | Spec 2.10.0: muting keeps audio controls visible with a muted state and one-tap unmute (no auto-play); mute enforced once in `speechService` for speech, recordings and chimes |
| AC-60 | FR-CNT-08 | `internal/readability/kids_test.go`, `cmd/ingest/kids_check_test.go` | PASS (automated) | SPEC-012: Kids reading check per band; blocks `"bands": true` lessons, warns on others |
| AC-61 | FR-CNT-09 | `internal/readability/kids_test.go`, `internal/i18n/parity_test.go`, `cmd/ingest/kids_check_test.go` | PASS (automated) | SPEC-012: banded lesson structure and Hindi lockstep |
| AC-62 | FR-UI-16 (amended 2.11.0) | `web/tests/kids-bands.spec.ts` | PASS (automated) | SPEC-012: age band choice, store v2 migration, band never sent |
| AC-63 | FR-UI-20 | `web/tests/kids-bands.spec.ts` | PASS (automated) | SPEC-012: 12+ layer shown only in 12–14 |
| AC-64 | FR-UI-21 | `web/tests/kids-word-cards.spec.ts` | PASS (automated) | SPEC-012: tappable word cards |
| AC-65 | FR-UI-22 | `web/tests/kids-aids.spec.ts` | PASS (automated) | SPEC-012: stepper Play and Pause |
| AC-66 | FR-UI-23 | `web/tests/kids-aids.spec.ts` | PASS (automated) | SPEC-012: big idea, recap, check-ins, teach-back |
| AC-67 | FR-UI-24 | `web/tests/kids-aids.spec.ts` | PASS (automated) | SPEC-012: guided widgets in 8–11 |
| AC-68 | FR-UI-25 | `web/tests/kids-aids.spec.ts` | PASS (automated) | SPEC-012: read-along for recordings |
| AC-69 | FR-UI-26 | `web/tests/detailed-lesson.spec.ts` | PASS (automated) | Read section buttons on Detailed sections (amended 2.15.0) |
| AC-70 | FR-UI-27 | `web/tests/kids-aids.spec.ts` | PASS (automated) | SPEC-012: scene pictures play on tap |
| AC-71 | FR-CNT-10 | `internal/i18n/ledger_en_test.go`, `cmd/review/review_test.go`, `cmd/ingest/verify_lang_test.go` | PASS (automated) | SPEC-013: the owner approves our own English text |
| AC-72 | FR-CNT-11, FR-UI-08 | `internal/api/lessons_test.go`, `web/tests/detailed-lesson.spec.ts` | PASS (automated) | SPEC-013: Detailed lessons, Go further and our own notebook |
| AC-73 | FR-TUT-14 | `internal/api/tutor_mode_test.go` | PASS (automated) | SPEC-013: the tutor grounds on the version on screen, else on Detailed |
| AC-74 | FR-CNT-12 | `internal/ingest/verify_test.go`, `internal/api/lessons_test.go` | PASS (automated) | SPEC-013: every lesson is ours, three versions each; Detailed is the fallback |
| AC-75 | FR-CNT-12, NFR-LIC-01 | `cmd/ingest/own_course_test.go` | PASS (automated) | SPEC-013 SC-003: the shipped text names no other course |
| AC-76 | FR-UI-28 | `web/tests/clips.spec.ts` | PASS (automated) | SPEC-014: clip player controls, reduced motion, description |
| AC-77 | FR-CNT-13 | `internal/ingest/clips_test.go`, `internal/narration/text_test.go`, `internal/api/tutor_mode_test.go` | PASS (automated) | SPEC-014: clip data, release check, narration tracks, tutor text |
| AC-78 | FR-UI-28 | `web/tests/clips.spec.ts` | PASS (automated) | SPEC-014: clip voice, one sound at a time, mute |
