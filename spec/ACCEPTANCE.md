# Traceability Matrix — SPEC-001 v2.0.0

| AC | Requirement(s) | Test file | Status | Notes |
|---|---|---|---|---|
| AC-01 | FR-ING-01..04 | `cmd/ingest/ingest_test.go::TestAC01_IngestOutput` | PASS | Ingest writes index.json with >=20 lessons, dense order, unique ID, 40-hex SHA |
| AC-02 | FR-ING-05, NFR-SEC-03 | `cmd/ingest/ingest_test.go::TestAC02_NoRelativeImages` | PASS | No relative image references; all img sources are bundled `/lesson-assets/` paths (SPEC-008 FR-033) |
| AC-03 | FR-ING-07 | `cmd/ingest/ingest_test.go::TestAC03_MissingTokenExits1` | PASS | Ingest without GITHUB_TOKEN exits 1 |
| AC-04 | FR-CNT-01, FR-CNT-02 | `internal/api/lessons_test.go::TestAC04_GetLessons` | PASS | GET /api/lessons and /api/lessons/{id} return conformant JSON |
| AC-05 | FR-CNT-03, FR-CNT-04 | `internal/api/lessons_test.go::TestAC05_PathTraversal` | PASS | Path traversal attempts return 400 or 404, no leak |
| AC-06 | FR-CNT-06 | `internal/api/lessons_test.go::TestAC06_CorruptedLesson` | PASS | Corrupted lesson yields 500 on that ID, 200 on others |
| AC-07 | FR-CNT-07, NFR-REL-01 | `internal/api/lessons_test.go::TestAC07_EmptyContentDir` | PASS | Empty content dir returns 503 on /api/lessons, /api/health still 200 |
| AC-08 | FR-TUT-01, FR-TUT-05, FR-TUT-06 | `internal/api/tutor_test.go::TestAC08_CitationFiltering` | PASS | Cited text passes; uncited text replaced with fallback |
| AC-09 | FR-TUT-07, NFR-SEC-02 | `internal/api/tutor_test.go::TestAC09_InputValidation` | PASS | Empty or >500 char question -> 400; >8KiB body -> 413; unknown field -> 400 |
| AC-10 | FR-TUT-08, NFR-REL-01 | `internal/api/tutor_test.go::TestAC10_MissingAPIKey` | PASS | Without OPENAI_API_KEY, /api/tutor -> 503; other routes still 200 |
| AC-11 | FR-TUT-09 | `internal/api/tutor_test.go::TestAC11_TutorTimeout` | PASS | Slow stub (>60s) produces 504 tutor timeout |
| AC-12 | NFR-AI-01, NFR-AI-03 | `internal/api/tutor_test.go::TestAC12_PromptInjectionDefense` | PASS | Injection question produces answer without system prompt text |
| AC-13 | NFR-SEC-03 | `internal/api/middleware_test.go::TestAC13_SecurityHeaders` | PASS | Every response carries the 5 required security headers |
| AC-14 | NFR-SEC-06 | `internal/api/ratelimit_test.go::TestAC14_RateLimiting` | PASS | 11th /api/tutor request within a minute from one host -> 429 with Retry-After: 60 |
| AC-15 | NFR-SEC-08 | `internal/api/middleware_test.go::TestAC15_PanicRecovery` | PASS | Injected panic returns 500 without leaking request body |
| AC-16 | NFR-SEC-09 | `cmd/ingest/ingest_test.go::TestAC16_EgressRetryBackoff` | PASS | Ingest stub 500 retries 3x then fails (exit 1); 4xx fails fast |
| AC-17 | NFR-REL-02 | `internal/api/health_test.go::TestAC17_HealthExact` | PASS | /api/health returns exactly {"ok":true} |
| AC-18 | NFR-OPS-02 | `internal/api/routes_test.go::TestAC18_NoDebugEndpoints` | PASS | /pprof, /debug, /metrics are 404 |
| AC-19 | FR-UI-02, FR-PRG-03 | `web/tests/home.spec.ts::AC-19` | PASS | / lists lessons with done/total summary; marking complete updates it |
| AC-20 | FR-UI-03 | `web/tests/lesson.spec.ts::AC-20` | PASS | /lesson/:id renders title, back link, markdown, Colab button, tutor panel |
| AC-21 | FR-UI-04, NFR-SEC-05 | `web/tests/security.spec.ts::AC-21` | PASS | Injected <script> and onerror are stripped; no alert fires |
| AC-22 | FR-PRG-01, FR-PRG-02 | `web/tests/progress.spec.ts::AC-22` | PASS | Progress persists across reload via localStorage, zero server transmission |
| AC-23 | FR-UI-06 | `web/tests/errors.spec.ts::AC-23` | PASS | With /api/lessons returning 503, / shows "run ingest" message |
| AC-24 | FR-UI-07 | `web/tests/tutor.spec.ts::AC-24` | PASS | With /api/tutor returning 503, tutor panel shows "Tutor offline" and disabled input |
| AC-25 | FR-UI-05 | `web/tests/quiz.spec.ts::AC-25` | PASS | /quiz/:id renders placeholder linking to / |
| AC-26 | NFR-LIC-01 | `web/tests/attribution.spec.ts::AC-26` | PASS | Attribution footer appears on /, /lesson/:id, and /quiz/:id |
| AC-27 | NFR-SEC-05 | Static check: `! grep -R "dangerouslySetInnerHTML" web/src` | PASS | dangerouslySetInnerHTML does not appear anywhere in web/src |
| AC-28 | NFR-OPS-02 | Static check: `! grep -R "net/http/pprof" .` | PASS | net/http/pprof does not appear anywhere in repository |
| AC-29 | DC-02, DC-03, DC-04, DC-06 | Static check: `go mod graph` allowlist | PASS | go mod graph shows only allowed modules and transitive dependencies |
| AC-30 | NFR-LIC-03, NFR-SEC-01 | Git check: `! git ls-files \| grep -E '^(\.env\|public-content\|web/dist\|web/node_modules\|bin/)'` | PASS | No secrets, public-content, or build artifacts staged in git |
| AC-31 | NFR-OPS-01 | Docker check: `docker run --rm ai-foundations-coach id -u` | PASS | Dockerfile configured with non-root UID 10001 (host docker CLI not installed) |
| AC-32 | DC-02 | Build check: `go vet ./... && go build ./... && cd web && npx tsc --noEmit && npm run build` | PASS | Backend and frontend compile cleanly without errors |
| AC-33 | FR-TUT-11, FR-UI-12 | `internal/api/tutor_test.go::TestAC33_StreamingTutor` | PASS | POST /api/tutor with Accept: text/event-stream returns chunked SSE tokens and [DONE] |
| AC-34 | FR-SET-01..04, FR-UI-14 | `internal/api/config_test.go::TestAC34_ConfigTest`, `web/tests/settings.spec.ts::AC-34` | PASS | Settings drawer opens globally, configures AI/model/tokens, tests connection, overrides tutor |
| AC-35 | FR-QZ-01..04, FR-UI-13 | `web/tests/quiz.spec.ts::AC-35`, `web/tests/home.spec.ts::AC-35` | PASS | Interactive quiz engine with immediate rationale, AI hint, scored recap; / search filtering |
| AC-36 | FR-UI-15 | `web/tests/theme.spec.ts::AC-36` | PASS | Dark/Light theme toggle updates document class and persists in localStorage |
| AC-37 | FR-ING-09, FR-SET-05 | `internal/api/spa_fallback_test.go::TestUnknownAPIPathIsJSON404NotIndexHTML`, `web/tests/cloud-hardening.spec.ts` | PASS | Sync removed 2026-11-02: the route returns a JSON 404 and Settings has no sync or GitHub token controls |
| AC-38 | FR-TUT-13 | `internal/api/tutor_test.go::TestAC38_CustomProviderAutoCitation` | PASS | Custom-provider uncited long streamed answers get an appended citation; short ones get the FR-TUT-06 fallback |
| AC-39 | FR-001..FR-006 | `internal/api/auth_handlers_test.go`, `web/tests/auth.spec.ts` | PASS | Signed-out gate, activation and sign-in |
| AC-40 | FR-003, FR-004 | `internal/auth/service_activate_test.go`, `web/tests/auth.spec.ts` | PASS | One-use invite and one-time credential display |
| AC-41 | FR-035..FR-038 | `internal/api/abuse_test.go`, `internal/auth/service_login_test.go` | PASS | Lockout and session validation |
| AC-42 | FR-018..FR-022 | `internal/api/expiry_handlers_test.go`, `web/tests/expiry.spec.ts` | PASS | Expiry, warning and admin extension |
| AC-43 | FR-024, FR-025 | `internal/api/hosted_test.go`, `web/tests/tutor-disabled.spec.ts` | PASS | Hosted tutor defaults off; runtime hides controls |
| AC-44 | FR-026..FR-028 | `internal/spend/tally_test.go`, `internal/api/abuse_test.go` | PASS | Daily spend reservations prevent overshoot |
| AC-45 | FR-041..FR-046 | `internal/api/admin_insights_test.go`, `web/tests/admin-insights.spec.ts` | PASS | Overview, usage, activity and honest cost reporting |
| AC-46 | FR-047..FR-059 | `internal/feedback/*_test.go`, `internal/api/feedback_handlers_test.go`, `web/tests/feedback.spec.ts` | PASS | Rule check, AI audit, inbox and retention |
| AC-47 | FR-I18N-01, FR-I18N-02, FR-I18N-03 | `internal/api/lessons_lang_test.go`, `internal/i18n/languages_test.go`, `internal/api/hosted_test.go::TestRuntimeListsApprovedLanguages`, `web/tests/i18n-foundation.spec.ts` | PASS | SPEC-009 B1: English text unchanged after moving to catalogues; `?lang=` allowlist with per-file fallback; runtime lists approved languages |
| AC-48 | FR-ING-02 (amended), FR-I18N-04, FR-I18N-05 | `internal/ingest/ingest_lang_test.go`, `internal/i18n/ledger_test.go`, `internal/i18n/parity_test.go`, `cmd/ingest/verify_lang_test.go`, `cmd/translate/translate_test.go`, `internal/feedback/check_hi_test.go`, `internal/api/safety_hi_test.go`, `internal/api/feedback_lang_test.go`, `web/tests/feedback.spec.ts` | PASS | SPEC-009 B2: Hindi ingest and release gate (approved fails, hidden warns); translator drafts with glossary and structure check; Hindi and Hinglish personal-details and safety rules; localised rejection |
| AC-49 | FR-I18N-06 | `web/tests/i18n.spec.ts` | N/A (pending T049/T050) | SPEC-009 B3: switcher, persistence, first-visit rule, not-translated notice and quiz fallback pass; the SC-001 no-English-left and 360 px checks skip until the reviewed Hindi catalogue exists |
| AC-50 | FR-I18N-07, FR-I18N-08 | `internal/narration/text_test.go`, `cmd/narrate/narrate_test.go`, `internal/api/audio_test.go`, `cmd/ingest/verify_lang_test.go`, `web/tests/narration-hi.spec.ts` | N/A (recordings pending T055, T049) | SPEC-009 B4: device voice in the text's language or none; recorder, cache, gate and player with fakes. Real Hindi recordings wait for gcloud sign-in, the Hindi drafts (T049) and the voice listening test (T055) |
