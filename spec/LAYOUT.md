# Appendix — Repository Layout (DC-05)

The repository follows a clean, single-binary architecture with Go backend serving static React SPA assets.

```text
.
├── .env.example                  # Environment variable template (NFR-SEC-01)
├── .gitignore                    # Git exclusion rules (NFR-SEC-01, NFR-LIC-03, AC-30)
├── Dockerfile                    # Multi-stage non-root container build (NFR-OPS-01)
├── LICENSE                       # MIT License (NFR-LIC-04)
├── README.md                     # Documentation & pinned SHA (NFR-LIC-01, NFR-LIC-03)
├── go.mod                        # Go module definition (DC-02, DC-06)
├── go.sum                        # Go module checksums
├── cmd/
│   ├── ingest/                   # Content ingestion CLI (FR-ING-*, DC-03)
│   │   ├── main.go
│   │   └── ingest_test.go        # AC-01, AC-02, AC-03, AC-16
│   └── server/                   # HTTP server entrypoint (DC-02, DC-08)
│       └── main.go
├── internal/
│   ├── api/                      # HTTP handlers and middleware (FR-CNT-*, NFR-SEC-*)
│   │   ├── health.go             # /api/health (NFR-REL-02, AC-17)
│   │   ├── health_test.go
│   │   ├── lessons.go            # /api/lessons (FR-CNT-*, AC-04..07)
│   │   ├── lessons_test.go
│   │   ├── middleware.go         # Security headers, CSP, panic recovery (NFR-SEC-*, AC-13, AC-15)
│   │   ├── middleware_test.go
│   │   ├── ratelimit.go          # IP rate limiting (NFR-SEC-06, AC-14)
│   │   ├── ratelimit_test.go
│   │   ├── routes_test.go        # AC-18 (no /pprof, /debug, /metrics)
│   │   ├── tutor.go              # /api/tutor endpoint (FR-TUT-*, AC-08..12)
│   │   └── tutor_test.go
│   ├── content/                  # Local content filesystem loader (FR-CNT-*)
│   │   └── loader.go
│   └── tutor/                    # Grounded tutor service (FR-TUT-*, DC-04)
│       └── service.go
├── public-content/               # Generated lesson artifacts (gitignored, NFR-LIC-03)
│   ├── index.json
│   └── lessons/
│       └── *.json
├── spec/
│   ├── ACCEPTANCE.md             # Traceability matrix (Rule 2, §11)
│   ├── AGENT.md                  # Directive and rules
│   ├── LAYOUT.md                 # Layout appendix (DC-05)
│   └── SPEC.md                   # Normative specification (SPEC-001)
└── web/                          # Frontend SPA (DC-01)
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── api.ts
    │   ├── store.ts              # Zustand localStorage progress (FR-PRG-*)
    │   ├── components/
    │   │   ├── Attribution.tsx   # Mandatory footer (NFR-LIC-01, FR-ATT-01)
    │   │   ├── MarkdownBlock.tsx # Sanitized renderer (FR-UI-04, NFR-SEC-05)
    │   │   └── TutorPanel.tsx    # Grounded tutor UI (FR-UI-03, FR-UI-07)
    │   └── pages/
    │       ├── Home.tsx          # Lesson listing and progress (FR-UI-02)
    │       ├── Lesson.tsx        # Lesson detail view (FR-UI-03)
    │       └── Quiz.tsx          # Quiz placeholder (FR-UI-05)
    └── tests/                    # Playwright end-to-end tests
        ├── home.spec.ts          # AC-19
        ├── lesson.spec.ts        # AC-20
        ├── security.spec.ts      # AC-21
        ├── progress.spec.ts      # AC-22
        ├── errors.spec.ts        # AC-23
        ├── tutor.spec.ts         # AC-24
        ├── quiz.spec.ts          # AC-25
        └── attribution.spec.ts   # AC-26
```
