// SPEC: SPEC-009 FR-001..FR-005, FR-009, FR-010; research R1
// In-house interface text (no i18n dependency, DC-06). English is bundled; every other language's
// catalogue is a separate chunk fetched only when that language is chosen, so English pages
// never download it (SC-007).
import { createElement, useEffect, type ReactNode } from 'react'
import { create } from 'zustand'
import en from './en.json'
import { ENGLISH, useLanguageStore, useRuntimeStore, type RuntimeLanguage } from '../store'

type Catalog = Record<string, string>
type Vars = Record<string, string | number>

const english: Catalog = en as Catalog

// Lazy loaders for every catalogue except English, found at build time.
const loaders = import.meta.glob<{ default: Catalog }>(['./*.json', '!./en.json'])

interface CatalogState {
  catalogs: Record<string, Catalog>
  add: (code: string, catalog: Catalog) => void
}

const useCatalogStore = create<CatalogState>()((set) => ({
  catalogs: { en: english },
  add: (code, catalog) => set((s) => ({ catalogs: { ...s.catalogs, [code]: catalog } })),
}))

export async function loadCatalog(code: string): Promise<void> {
  if (useCatalogStore.getState().catalogs[code]) return
  const load = loaders[`./${code}.json`]
  if (!load) return // not shipped yet: English text is used
  try {
    useCatalogStore.getState().add(code, (await load()).default)
  } catch {
    /* network or parse failure: English stays in use */
  }
}

// The language actually shown: the stored choice if it is still offered, else the first-visit rule
// (FR-003), else English. A stored choice that is no longer offered is kept for when it returns.
export function effectiveLanguage(
  stored: string | null,
  offered: RuntimeLanguage[],
  preferred: readonly string[] = typeof navigator !== 'undefined' ? navigator.languages ?? [] : []
): string {
  const ok = new Set(offered.map((l) => l.code))
  if (stored) return ok.has(stored) ? stored : ENGLISH.code
  for (const tag of preferred) {
    const primary = tag.toLowerCase().split('-')[0]
    if (primary === ENGLISH.code) break // English comes first: stay in English
    if (ok.has(primary)) return primary
  }
  return ENGLISH.code
}

export function currentLanguage(): string {
  return effectiveLanguage(useLanguageStore.getState().code, useRuntimeStore.getState().languages)
}

export function useLanguage(): { code: string; language: RuntimeLanguage; languages: RuntimeLanguage[] } {
  const stored = useLanguageStore((s) => s.code)
  const languages = useRuntimeStore((s) => s.languages)
  const code = effectiveLanguage(stored, languages)
  return { code, language: languages.find((l) => l.code === code) ?? ENGLISH, languages }
}

function interpolate(text: string, vars?: Vars): string {
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m))
}

export function translate(catalogs: Record<string, Catalog>, code: string, key: string, vars?: Vars): string {
  const pick = (k: string) => catalogs[code]?.[k] ?? english[k]
  let text: string | undefined
  if (vars && typeof vars.count === 'number') {
    const form = new Intl.PluralRules(code).select(vars.count)
    text = pick(`${key}.${form}`) ?? pick(`${key}.other`)
  }
  text ??= pick(key)
  if (text === undefined) {
    if (import.meta.env.DEV) console.warn(`i18n: missing key "${key}"`)
    return '' // never show a raw key to a learner
  }
  return interpolate(text, vars)
}

export type TFunction = (key: string, vars?: Vars) => string

export function useT(): TFunction {
  const { code } = useLanguage()
  const catalogs = useCatalogStore((s) => s.catalogs)
  return (key, vars) => translate(catalogs, code, key, vars)
}

// Non-React code (services, api.ts) reads the current text through this.
export function t(key: string, vars?: Vars): string {
  return translate(useCatalogStore.getState().catalogs, currentLanguage(), key, vars)
}

// Mount once (App): loads the chosen catalogue and keeps <html lang> in step (FR-004).
export function useApplyLanguage(): void {
  const { code } = useLanguage()
  useEffect(() => {
    document.documentElement.lang = code
    void loadCatalog(code)
  }, [code])
}

// Catalogue text may mark bold words as <b>…</b> so a translator keeps whole sentences (and can move
// the bold words). Only <b> is recognised; anything else stays plain text, so no HTML is ever injected.
export function rich(text: string, boldClassName?: string): ReactNode[] {
  return text
    .split(/<b>(.*?)<\/b>/g)
    .map((part, i) => (i % 2 ? createElement('strong', { key: i, className: boldClassName }, part) : part))
}

// English keeps the SPEC-008 house style ("6 Nov 2026"), which is en-GB order rather than en-US.
const intlLocale = (code: string) => (code === ENGLISH.code ? 'en-GB' : code)

export function formatNumber(n: number, code = currentLanguage()): string {
  return new Intl.NumberFormat(intlLocale(code)).format(n)
}

// Times stay in IST (SPEC-008 FR-046).
export function formatDate(d: Date | string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }, code = currentLanguage()): string {
  return new Intl.DateTimeFormat(intlLocale(code), { timeZone: 'Asia/Kolkata', ...opts }).format(typeof d === 'string' ? new Date(d) : d)
}
