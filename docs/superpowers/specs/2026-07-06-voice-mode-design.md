# Voice Mode Design

**Goal:** Let a user speak their message instead of typing it, and optionally have the AI's replies read back aloud — entirely client-side, no backend changes.

**Architecture:** Two small hooks wrap the browser's native Web Speech API (`SpeechRecognition` for input, `speechSynthesis` for output). A single tri-state `VoiceModeButton` component ties both into one control placed at the left of the chat input, replacing the idea of two separate icons. Everything is feature-detected and disappears entirely on unsupported browsers (e.g. Firefox lacks `SpeechRecognition`).

**Tech Stack:** React 18, native browser Web Speech API (`webkitSpeechRecognition`/`SpeechRecognition`, `window.speechSynthesis`) — no new npm dependencies, no backend involvement.

---

## Why one combined control, not two

Originally scoped as two independent pieces — a mic button (start/stop listening) and a separate voice-replies toggle (auto-speak on/off). During design review there wasn't enough room in the existing `chatbox__model-controls` cluster for a second icon, and the two concepts were folded into one: a single **"Voice Mode"** control that governs both capturing your speech and reading replies back, rather than two independently-toggleable switches. This is simpler for the user to reason about ("voice mode is on" vs. tracking two separate states) and fits the available UI space.

---

## `VoiceModeButton` — 3 states, 1 button

Placed at the left of `.chatbox__input`, before the text `<input>`. Cycles:

1. **Off** (default, gray mic icon) — tap → turns voice mode on and immediately starts listening.
2. **Listening** (red mic icon, pulsing) — actively capturing speech. Tap again → stops listening; the transcript fills the existing message textbox for you to review/edit, same as typing. It is never auto-sent.
3. **Voice mode on / idle** (blue speaker icon) — replies will be read aloud automatically; tap → starts listening again for the next message. A long-press (or a small dismiss affordance) returns to state 1, silencing auto-playback.

No new send path is introduced — voice input only ever populates the existing `newMessage` state; you still hit Send (or Enter) yourself.

---

## Hooks

### `useSpeechRecognition({ onResult })`
`frontend-react/src/hooks/useSpeechRecognition.js`

- Feature-detects `window.SpeechRecognition || window.webkitSpeechRecognition` once; exposes `isSupported`.
- `start()` creates a one-shot (non-continuous) recognizer. The browser auto-stops after a pause in speech and fires a final transcript via `onresult`, which is forwarded to the caller's `onResult(transcript)` callback.
- `stop()` lets the user manually cut listening short (calls the recognizer's own `.stop()`).
- `isListening` reflects current state; flips false on `onend` or `onerror`.
- On permission denial (`event.error === 'not-allowed'`), the hook does not crash — it stops listening and the caller is responsible for surfacing a message (see Error Handling).

### `useSpeechSynthesis()`
`frontend-react/src/hooks/useSpeechSynthesis.js`

- Feature-detects `'speechSynthesis' in window`; exposes `isSupported`.
- `enabled` is persisted to `localStorage` (key: `voiceRepliesEnabled`), default `false` — matches the existing pattern for `selectedModel` in `Home.jsx`. No backend/DB involvement; this is a device-local preference, not a user-account setting.
- `speak(text)` calls `window.speechSynthesis.cancel()` first (so a fast second reply doesn't queue behind the first), then speaks `text` only if `enabled` is true.
- `stop()` cancels any in-flight speech (used when the user manually exits voice mode).

---

## Integration in `Home.jsx`

- `VoiceModeButton` renders only if `useSpeechRecognition().isSupported` — if the browser can't listen at all, there's no reason to show a control whose second state (voice replies) depends on entering the first.
- Its `active` visual states map onto: `isListening` (state 2) and `enabled` from `useSpeechSynthesis` (state 3); state 1 is neither.
- Tapping in state 1: calls `setEnabled(true)` and `start()` together.
- Tapping in state 2: calls `stop()`.
- Tapping in state 3: calls `start()` again (next utterance).
- Long-press / exit gesture: calls `setEnabled(false)` and `stop()` (in case speech is mid-playback).
- `useSpeechRecognition`'s `onResult` appends the transcript into the existing `newMessage` state (`setNewMessage(prev => prev ? \`${prev} ${transcript}\` : transcript)`), so partial dictation across multiple listen sessions concatenates naturally.
- One line added at the existing point where an assistant reply arrives (where `setMessages` is called with the new AI message): `if (voiceReplies.enabled) voiceReplies.speak(message_content)`.

No changes to `sendMessage`, the message list rendering, or any backend call.

---

## Error Handling

- **Browser lacks `SpeechRecognition` or `speechSynthesis`:** the relevant capability (and, since they're now one combined control, the whole `VoiceModeButton`) is not rendered at all — no disabled/dead button, no error state for something structurally impossible.
- **Microphone permission denied:** `useSpeechRecognition`'s `onerror` handler catches `not-allowed` and stops listening; `Home.jsx` surfaces this through its existing `alertMessage`/`showAlert` mechanism (already used for session-expired messages) rather than introducing a new toast system — e.g. "Microphone access denied. Check your browser's site permissions."
- **Recognition error mid-listen (network drop, no speech detected):** `onerror` stops listening cleanly, button reverts to its prior non-listening state; no crash, no stuck "Listening..." state.
- **Rapid successive replies while voice mode is on:** `speak()`'s `cancel()`-then-speak sequencing prevents queued/overlapping audio.

---

## Testing

This repository has no frontend test framework (confirmed during the admin-UI work — `frontend-react/package.json` has no jest/vitest/testing-library). Consistent with that precedent, this feature is verified manually rather than via new test infrastructure:

1. Chrome/Edge (full support): tap mic → speak → verify transcript fills the input → send → verify reply appears. Enable voice mode, verify next reply is read aloud. Long-press to exit, verify silence resumes.
2. Safari: same flow (has partial `webkitSpeechRecognition` support) — verify no crash if a given capability is missing.
3. Firefox: verify the `VoiceModeButton` does not render at all (no `SpeechRecognition` support).
4. Deny microphone permission when prompted — verify the alert message appears and the app doesn't hang in a "Listening..." state.

## Edge Cases

- User denies mic permission the first time, then grants it later via browser settings — next tap should work normally; no stale denied-state is cached client-side beyond the current page session.
- Switching browser tabs away while listening — relies on the browser's own `SpeechRecognition` lifecycle (typically ends the session); the button reverts to state 1 via `onend`.
- `enabled` (voice replies) persists across page reloads via `localStorage`; `isListening` does not persist (always starts in state 1 or 3 depending on `enabled`, never resumes an active listen session across a reload).
