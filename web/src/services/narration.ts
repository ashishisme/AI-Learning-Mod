// SPEC: SPEC-009 FR-012, FR-013, research R11
// Recorded narration: each language's manifest is fetched once, and a track's file is found by its key
// ("<lessonId>/<mode>/<trackId>" or "global/<trackId>") and persona. English has no recordings.

interface Manifest {
  tracks?: Record<string, Record<string, { file: string }>>
}

const manifests = new Map<string, Promise<Manifest | null>>()

export async function recordingFor(code: string, key: string, persona: string): Promise<string | null> {
  if (code === 'en' || !/^[a-z]{2,3}$/.test(code)) return null
  let loading = manifests.get(code)
  if (!loading) {
    loading = fetch(`/api/audio/${code}/manifest.json`)
      .then((r) => (r.ok ? (r.json() as Promise<Manifest>) : null))
      .catch(() => null) // offline or not recorded yet: the device voice is used
    manifests.set(code, loading)
  }
  const file = (await loading)?.tracks?.[key]?.[persona]?.file
  return file ? `/api/audio/${code}/${file}` : null
}
