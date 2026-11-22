// Build identity, injected by vite.config.ts at build time (not computed at render time).
export const buildInfo = {
  number: __BUILD_NUMBER__,
  commit: __BUILD_COMMIT__,
  dirty: __BUILD_DIRTY__,
  date: __BUILD_DATE__,
  release: __RELEASE_TAG__,
}

/** e.g. "Build #56 · 4d94b1c+dirty · 2026-11-01" */
export function formatBuild(): string {
  const commit = buildInfo.dirty ? `${buildInfo.commit}+dirty` : buildInfo.commit
  return `Build #${buildInfo.number} · ${commit} · ${buildInfo.date}`
}
