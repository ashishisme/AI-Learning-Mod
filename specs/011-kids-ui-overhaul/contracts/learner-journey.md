# Learner Journey Contract

## Active values

```ts
type AudienceMode = 'standard' | 'junior' | 'plain-english'
```

All three are active, selectable journeys (owner decision, 2026-11-04). `junior` displays as Kids.

## Persistence

```ts
type AudienceModeState = {
  mode: AudienceMode
  hasChosenJourney: boolean
}
```

A saved preference is kept as it is. Reading it never changes the progress, theme, language, audio or settings stores.

## Client/API

Unchanged from today: Kids and Plain English requests carry `mode`, and Standard requests omit it.

```http
GET /api/lessons/{id}?mode=junior&lang=hi
POST /api/tutor

{"lessonId":"3-neuralnetworks","question":"...","mode":"plain-english","lang":"en"}
```

A missing Kids or Plain English lesson yields the existing not-available message with a journey switch. Feedback records the journey as today.

## Presentation

- First-time learners choose Kids, Plain English or Standard before a lesson loads.
- Returning learners open their saved journey and can switch with the three-option control.
- Switching preserves route, language, progress and settings; it replaces only the lesson representation.
- Actions have localized visible/programmatic labels, keyboard use and 44 px targets.
- Visual wrapper requires approved asset ID, localized alt key or `decorative=true`, reserved dimensions and reduced-motion behaviour.

