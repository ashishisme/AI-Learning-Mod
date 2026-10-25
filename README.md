# AI Foundations Coach

A self-paced learning application for the [microsoft/AI-For-Beginners](https://github.com/microsoft/AI-For-Beginners) curriculum featuring a grounded, citation-enforced AI tutor.

## Attribution & Licensing

Curriculum based on [microsoft/AI-For-Beginners](https://github.com/microsoft/AI-For-Beginners) (MIT License). Not affiliated with Microsoft.
This software is licensed under the [MIT License](LICENSE).

## Architecture & Design

Built to comply with `spec/SPEC.md` (SPEC-001 v1.0.0):
- **Backend:** Go 1.23 standard library `net/http` router, strict security middleware, bounded-memory rate limiter, and grounded tutor service.
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Zustand client-side `localStorage` progress tracking, and sanitized markdown renderer.
- **Ingestion:** Go CLI tool generating static, normalized lesson bundles from the upstream repository.

## Upstream Curriculum Ingestion

The curriculum artifacts in `public-content/` are reproducible build artifacts generated via:

```bash
export GITHUB_TOKEN="<your-github-personal-access-token>"
go run ./cmd/ingest
```

### Pinned Upstream SHA
- **Repository:** `microsoft/AI-For-Beginners`
- **Pinned Commit SHA:** `392d0df1b2647cbee104942390551f1ed9e072c8`

## Running the Application

### Development

```bash
# Backend
go run ./cmd/server

# Frontend
cd web
npm install
npm run dev
```

### Production (Single Container)

```bash
docker build -t ai-foundations-coach .
docker run -p 8080:8080 -e OPENAI_API_KEY="..." ai-foundations-coach
```
