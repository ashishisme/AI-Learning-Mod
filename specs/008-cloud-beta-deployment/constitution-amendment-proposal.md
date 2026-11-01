# Constitution Amendment Proposal: DC-09 (Minimal Account & Operational Store)

**Status**: **Ratified 2026-11-01** by the owner; applied to `.specify/memory/constitution.md` (2.1.0) and `spec/SPEC.md` §8. One wording change from the proposal below: the managed-store requirement applies to hosted deployments, and a file-backed implementation behind the store interface is allowed for development, tests and single-instance self-hosting.
**Proposed**: 2026-11-01
**Affects**: `.specify/memory/constitution.md` §III (DC-09) and `spec/SPEC.md` §8 (must be updated together, per Governance)

## Current text

> **Zero Database (DC-09)**: No database, ORM, session store, or server-side persistent state in v1/v2. Lessons are stored as static JSON files generated during ingestion.

## Proposed text

> **Minimal State (DC-09, amended)**: Lessons remain static JSON packaged with the release. Server-side persistent state is permitted **only** for:
> (a) access-control records — invites, pseudonymous beta accounts, sessions, and admin audit entries;
> (b) operational counters — e.g. daily AI spend tally and rate-limit counters.
> Such state MUST NOT contain personal data (names, emails, phone numbers, dates of birth), learner question text, or answers; MUST use a managed serverless store that costs nothing when idle; and MUST NOT introduce an ORM. Learner progress and preferences remain browser-local.

## Rationale

- Invite-only access with expiry (SPEC-008 Q3) and a shared spend ceiling (Q1) are impossible without persistent server-side state.
- The amendment is deliberately narrow, so the privacy-first and near-zero-cost properties of the original rule survive.

## Version impact

Constitution 2.0.0 → **2.1.0** (MINOR: materially expanded guidance on an existing constraint).

---

# Amendment 2: DC-09 extended for usage counts and feedback (2.1.0 to 2.2.0)

**Status**: **Ratified 2026-11-01** by the owner; applied to `.specify/memory/constitution.md` (2.2.0) and `spec/SPEC.md` §8, text identical to the proposal below. (Owner request for an admin console with usage, user and feedback views.)

## Proposed text (additions in bold)

> Server-side persistent state is permitted **only** for: (a) access-control records ...; (b) operational counters ... **including aggregate usage counts per day and a last-seen time per beta account**; **(c) learner feedback records: a rating, a category, a message of at most 500 characters scrubbed of emails, phone numbers and links, and context fields (group label, lesson, audience mode, app version, time), with no Beta ID, network address, session or device details, deleted automatically after 180 days.** Such state MUST NOT contain personal data ..., or learner question or answer text **from the AI tutor**; ...

## Rationale

- Admins need to see usage and read what learners say; both are impossible without server-side state.
- Feedback is the only place learners write free text. Narrowing it (no identity, scrubbed, short, auto-deleted) keeps the privacy intent of DC-09 and FR-035.

## Risk

- Children may type personal details despite the warning. Mitigations are in FR-048, FR-049, FR-053. Residual risk is the owner's to accept.

## Version impact

Constitution 2.1.0 to **2.2.0** (MINOR). `spec/SPEC.md` §8 must be updated at the same time.
