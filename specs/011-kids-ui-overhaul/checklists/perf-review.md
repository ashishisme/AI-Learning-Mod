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

## Review (2026-11-06, T035)

The v0.4.3 tag and the working feature branch were each built with `npm run build` and served locally with the same generated lesson content. Chromium loaded each route in a fresh context seven times at 1280 px with download throughput throttled to 20 Mbit/s; the table reports median time to network idle. Compressed bytes are the sum of the first run's response bodies, using gzip for text, CSS, JavaScript and SVG and their delivered size for fonts and raster images. The local Go server serves files without HTTP gzip, so these byte figures are a compressed-size estimate rather than measured network transfer.

| Measure | v0.4.3 | Working build | Change | Target |
| --- | --- | --- | --- | --- |
| English home first download, compressed estimate | 578.8 KiB | 584.0 KiB | +5.2 KiB (+0.9%) | +350 KB max (SC-006) |
| `/` until network idle, median of 7 | 1,675 ms | 1,637 ms | -38 ms (-2.3%) | no more than 10% slower (SPEC-009 SC-007) |
| `/lesson/1-intro` until network idle, median of 7 | 2,640 ms | 2,644 ms | +4 ms (+0.2%) | no more than 10% slower |
| Kids home first download, compressed estimate | 578.8 KiB | 650.6 KiB | +71.8 KiB | +350 KB max (SC-006) |

Seven-run times (ms): v0.4.3 `/` = 1723, 1713, 1625, 1675, 1675, 1677, 1674; working `/` = 1631, 1767, 1637, 1634, 1646, 1633, 1647. v0.4.3 lesson = 2640, 2645, 2673, 2636, 2638, 2670, 2631; working lesson = 2633, 2644, 2674, 2646, 2640, 2647, 2635.

The Kids-only font files total 64,604 bytes; all shipped brand SVGs total 24,326 bytes on disk, or 9,069 bytes gzip compressed. The home route increase and both load-time comparisons meet the targets. **Recommendation: Keep. Owner decision pending before release.**
