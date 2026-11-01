# Technical Architecture & Plan: Interactive Audio & Speech Narration

**Feature ID**: `SPEC-004-AUDIO`  
**Branch**: `feature/v3.0.1-2`  
**Status**: Completed & Verified  

---

## 1. Architecture

1. **Client-side Web Speech API**:
   - Wrap `window.speechSynthesis` and `SpeechSynthesisUtterance` in a lightweight TypeScript helper.
   - Zero external audio assets (0 KB network overhead).
2. **Procedural Chimes via Web Audio API**:
   - Synthesize chime sounds with `AudioContext`, gain nodes, and exponential decay curves.
3. **Mascot Audio Trigger**:
   - Add "Listen to Chip" toggle with playback controls (play/pause/stop).

## 2. Verification
- Manual verification of speech synthesis and chime triggers.
- Unit and UI test suites.
