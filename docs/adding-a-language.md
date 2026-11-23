# Adding a language

This guide is for the owner and developers adding a new Indian language after Hindi, for example
Tamil (`ta`). Most of the work is content and review.

Two parts are code and need a developer:
- the safety and personal-details rules;
- the server's own messages.

`internal/i18n/second_language_test.go` proves that everything else needs no code.

Each step below has a short reason. Commands run from the repository root on the owner's machine.

## Before you start

- **Right-to-left scripts.** **Urdu** is written right to left. The layout, icons and text direction need work before Urdu can ship.
- **A reviewer.** You need a native-speaker reviewer for the language before anything goes live.
- **Sign-ins:**
  - `gcloud` signed in to the project: `gcloud auth login`, then `gcloud config set project <project>`.

## Steps

**1. List the language as hidden.** Add it to `public-content/languages.json`:

```json
{ "code": "ta", "name": "தமிழ்", "speechLang": "ta-IN", "status": "hidden" }
```

A hidden language is built and checked, but learners never see it. `name` is written in the language's own script, because that is how learners find it in the switcher.

**2. Translate the lesson list.** Copy `public-content/index.json` to `public-content/lang/ta/index.json` and translate each `title`. Keep every `id`, `module` and `order` as they are.

- **The rule:** each title must be the start of that lesson's translated Detailed title, so the list shows only words the reviewer approved with the lesson. Finish this after step 4 has drafted the lessons; the release check names any title that does not match.
- **Without this file** the lesson list stays in English.

**3. Seed the glossary.** Create `content/glossary/ta.json` with the key terms in the same shape as `hi.json`. The reviewer confirms each term in step 6.

**4. Draft the app's own text with Gemini on Vertex AI.**

```bash
export TRANSLATE_BASE_URL="https://aiplatform.googleapis.com/v1/projects/<project>/locations/global/endpoints/openapi"
export TRANSLATE_MODEL="google/<current Gemini Flash model>"
export TRANSLATE_API_KEY="$(gcloud auth print-access-token)"   # valid for one hour
go run ./cmd/translate -lang ta -dry-run                         # fields and characters
go run ./cmd/translate -lang ta -only public-content/lang/ta/lessons/1-intro.junior.json   # pilot one file first
go run ./cmd/translate -lang ta                                  # the rest
```

- **What it does:** it drafts the UI catalogue, the quizzes and all three versions of every lesson (Kids, Plain English and Detailed).
- **What it protects:** it never overwrites a file that is approved and current, and it refuses an answer that breaks Markdown, code, links or placeholders. Rerun it for any file it reports.
- **The key:** never put `TRANSLATE_API_KEY` in CI, Terraform or the image.

**5. Choose the voices and record the narration.**

```bash
gcloud storage rsync --recursive gs://<narration bucket>/audio public-content/audio
export TTS_ACCESS_TOKEN="$(gcloud auth print-access-token)" TTS_PROJECT=<project>
go run ./cmd/narrate -lang ta -sample ta-IN-Wavenet-A            # listen; repeat for each candidate
```

- **Pick the voices.** Put one voice per persona (Chip, Nova, Prof. Alan) in `content/voices/ta.json`, then record:

```bash
go run ./cmd/narrate -lang ta -dry-run                           # recordings and characters billed
go run ./cmd/narrate -lang ta                                    # only new or changed text is recorded
gcloud storage rsync --recursive public-content/audio gs://<narration bucket>/audio
```

- **Re-record after the review.** Run `narrate` again after step 6, because corrected text has to be recorded again. It only records the tracks whose text changed.

**6. Review.** The reviewer corrects every file and the glossary in a pull request.
- **Approve each file:** run `go run ./cmd/review -lang ta -reviewer "Name" -approve <path>…` for each file they have checked. It records the hashes, their name and the date in `content/review/ta.json`, and refuses a file whose structure differs from English. `go run ./cmd/review -lang ta` shows what is still draft or stale.
- **Sample check:** rate 20 sampled sections for naturalness and accuracy for the age group.
- **Stale approvals:** any later change to a file or its English source makes its approval stale, and the release gate will say so.

**7. Code that a developer adds for the language.**
- **Personal-details and safety rules.** Add patterns in the new script and its common romanised form:
  - personal details in `internal/feedback/check.go`;
  - safety in `internal/api/safety.go`.

  Add test corpora like the Hindi ones in `testdata/`, and fold the script's digits and spelling variants. This is a security requirement, not optional. Without it, feedback written in the new language gets past the personal-details check.
- **Server messages.** Add the language to the maps in `internal/i18n/messages.go`: feedback rejections, safety replies and the tutor's "couldn't find that" reply. Without this the server answers in English.
- **Sentence ends.** If the script ends sentences with a mark other than `.` `?` `!` or `।`, add it to the splitting in `web/src/services/speechService.ts` and `cmd/narrate`.

**8. Approve the language.**
- Set `"status": "approved"` in `languages.json`.
- `go run ./cmd/ingest -verify` must print nothing for the language and exit 0. It checks:
  - review: every file translated, approved and current;
  - structure: every file matches the English one;
  - recordings: every narrated track recorded and current.

**9. Release.** Tag a release as usual.
- **Check the build:** the release build copies the recordings from the bucket, and its `-verify` blocks the image if anything is missing.
- **Check the live site:**
  - `/api/runtime` lists the language;
  - the switcher shows it;
  - a lesson plays its recorded narration.

## What Kannada and Tamil taught us (SPEC-015, 2026-11)

- **No reviewer yet?** The owner can approve as `-reviewer "owner (beta)"` and keep `"beta": true` in `languages.json`, so the switcher says "(beta)". Live learners then act as reviewers (SPEC-016).
- **Fonts.** Each script needs its Noto Sans font, and the Kids journey needs a matching Baloo font (Baloo Tamma 2 for Kannada, Baloo Thambi 2 for Tamil) in `web/src/index.css`. The fonts are self-hosted, and downloading them needs the owner's approval. `web/tests/languages-kn-ta.spec.ts` checks that each page fetches only its own script's font, and that the Kids font loads on Kids pages only.
- **Safety and personal-details tests run per language.** Add `testdata/<code>_*.json` corpora; the tests pick them up by file name. `i18n.FoldScripts` folds each script's digits to ASCII before the checks, so add the new script there.
- **Drafting.** Claude drafted every file. One subagent per lesson worked well, following a short brief such as `specs/015-kannada-tamil-languages/translation-brief.md`.
  - **Align terms afterwards.** Parallel drafters choose different words for the same term. Collect each drafter's terms in a `<code>-terms-to-align.md`, pick one form, update the glossary, then replace the others.
  - **Register.** The Kids journey uses the informal "you" (ನೀನು, நீ), and the adult journeys use the formal one (ನೀವು, நீங்கள்).
- **Phone width.** Longer words overflow. Run the 390 px check in the language test. Fix overflow by wrapping (`flex-wrap`, `break-words`, `min-w-0`), never by shrinking text.
- **Voices.** The Chirp3-HD voices Kore (Chip), Aoede (Nova) and Charon (Prof. Alan) worked for both languages.
  - **Long sentences.** These voices refuse long sentences. `cmd/narrate` shortens the request text (`shortSentences`), but the track text and its hash stay the same.
  - **Failed recordings.** A run can still fail part-way, for example 374 of 690 recorded. Rerun the same command: it records only the missing tracks.
- **Cost.** A language costs about 690 recordings and 270k–440k characters, or about $8–$15.
- **The upload.** After recording, the owner runs the rsync. Then check the upload: `gcloud storage cat …/audio/<code>/manifest.json | shasum -a 256` must equal the local manifest's hash.
- **Order of release.** Switch the language to `approved` only after the upload is checked, then run the gates, tag the release, and have the owner approve promote.

## What Marathi and Telugu added (SPEC-018, 2026-11)

- **Register.** After the Hindi आप fix, the owner chose the polite "you" in every journey, Kids included (तुम्ही, మీరు). Write this into the drafting brief before any drafting starts.
- **Align names with the interface.** Widget and screen names in lessons must match the interface strings (`web/src/i18n/<code>.json`) word for word. Check this before recording; a fix afterwards means re-recording those tracks.
- **Personal-details rules.** Telugu needed its number words, month names and a "my" pattern (నా, మా) in `internal/feedback/check.go`, and its script added to the digit-token pattern. Write apps without ZWNJ so both spellings match.
- **Recording.** Telugu took 831 recordings; 54 failed on the rate limit and a rerun recorded them.
- These were the last beta languages. Hindi, Kannada, Tamil, Marathi and Telugu are all live as beta.

- **Fixing wording after launch:** follow [fixing-a-translation.md](fixing-a-translation.md) for learner reports.
