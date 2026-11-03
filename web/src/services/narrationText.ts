// SPEC: SPEC-009 FR-012, research R10
// One narration text rule for the screen and the recordings. internal/narration/text.go is its Go twin;
// content/fixtures/narration-text.json keeps the two in step (web/tests/narration-hi.spec.ts).

// What a section's "Read section" button says, before cleaning.
export function sectionNarration(heading: string, chipQuote: string | undefined, body: string, chipSays: string): string {
  return `${heading}. ${chipQuote ? chipSays + chipQuote + '. ' : ''}${body}`
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
