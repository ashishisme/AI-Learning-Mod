// SPEC: SPEC-009 FR-012, research R10
// One narration text rule for the screen and the recordings. internal/narration/text.go is its Go twin;
// content/fixtures/narration-text.json keeps the two in step (web/tests/narration-hi.spec.ts).

// What a section's "Read section" button says, before cleaning.
export function sectionNarration(heading: string, chipQuote: string | undefined, body: string, chipSays: string): string {
  return `${heading}. ${chipQuote ? chipSays + chipQuote + '. ' : ''}${body}`
}

// SPEC-012: a banded Kids section reads its big idea first. internal/narration/text.go CoreBody is its twin.
export function coreBody(bigIdea: string | undefined, body: string): string {
  return bigIdea ? `${bigIdea}\n\n${body}` : body
}

// Markdown out, words in: links become their text, HTML tags go (before '>' is removed, so a tag
// never swallows the rest of the text), then the marks *_#`~> go, and list numbers keep one space.
export function cleanForSpeech(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/[*_#`~>]/g, '')
    .replace(/([0-9]+)\.\s+/g, '$1. ')
    .trim()
}

// FR-UI-26: a Standard lesson's Read section text, keyed by the heading's 1-based line. A section is a
// level 1–3 heading and its text up to the next heading, without code fences, tables or images.
export function headingSections(md: string): Map<number, string> {
  const out = new Map<number, string>()
  let fenced = false
  let start = 0
  let buf: string[] = []
  const flush = () => {
    if (start) out.set(start, cleanForSpeech(buf.join('\n').replace(/!\[[^\]]*\]\([^)]*\)/g, '')).replace(/\s+/g, ' '))
  }
  md.split('\n').forEach((line, i) => {
    const fence = /^\s*(```|~~~)/.test(line)
    if (fence) fenced = !fenced
    if (fence || fenced || /^\s*\|/.test(line)) return
    const h = /^ {0,3}#{1,3}\s+(.*?)(?:\s+#+)?\s*$/.exec(line)
    if (h) {
      flush()
      start = i + 1
      buf = [`${h[1]}.`]
      return
    }
    buf.push(line)
  })
  flush()
  return out
}
