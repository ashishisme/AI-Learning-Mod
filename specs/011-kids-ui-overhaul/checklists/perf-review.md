# Performance review: Kids-First UI Overhaul (SC-006, T035)

**Owner decision (2026-11-04):** build within SC-006's +350 KB, then review against v0.4.3 and SPEC-009 SC-007 (no more than 10% slower) before release.

## Added bytes so far

| Item | File | Bytes | Loads when |
| --- | --- | --- | --- |
| Baloo 2, weights 600–700, Latin subset | `web/public/fonts/Baloo2-SemiBoldBold.woff2` | 27,784 | Kids journey text is on screen (`unicode-range` Latin, scoped to `[data-journey="junior"]`) |
| Comic Neue Regular, Latin subset | `web/public/fonts/ComicNeue-Regular.woff2` | 18,584 | same |
| Comic Neue Bold, Latin subset | `web/public/fonts/ComicNeue-Bold.woff2` | 18,236 | same |
| **Fonts total** | | **64,604** (about 63 KB) | Kids only; Standard and Plain English load none of these |

Source: github.com/google/fonts (OFL, licences beside the files). The subsets were made with fonttools as a dev-only tool: Latin and punctuation plus ₹, WOFF2, with `kern`, `liga` and `calt`.

## Review (to fill in at T035)

| Measure | v0.4.3 | v0.5.0 | Change | Target |
| --- | --- | --- | --- | --- |
| English first download, gzip | 455.5 KiB | | | +350 KB max (SC-006) |
| `/` until the network is quiet, median of 7 | 1,146 ms | | | 10% (SPEC-009 SC-007) |
| `/lesson/1-intro` until the network is quiet | 2,253 ms | | | 10% |
| Kids home first load (fonts plus art) | n/a | | | within SC-006 |

The decision (keep or trim) is the owner's, recorded here.
