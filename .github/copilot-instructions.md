# Project Context

## Purpose

Build a small, polished educational chat client for the LOM AI frontend hiring assignment. The full requirements are in [the assignment](../Тестовое_задание_веб_клиент.md); treat that document as the source of truth.

## Stack and State

- The starter is React 19, TypeScript, and Vite. Keep the existing toolchain unless a requirement justifies changing it.
- Use Redux Toolkit for shared chat and message state; do not introduce RTK Query because the assignment has no remote API.
- Keep mock-agent behavior in a separate, typed module rather than coupling it to React components or Redux UI code.
- The agent is local and simulated: no backend, real LLM, external AI API, API keys, or authentication.

## Product Requirements

- Support multiple conversations, creating and switching chats, and retaining each chat's message history.
- Simulate delayed, incremental responses and clear lifecycle states, including errors and at least one mock tool-use flow.
- Include at least one response scenario that considers earlier messages in the active conversation.
- Handle empty, loading, streaming, error, retry, long-message, and chat-switching states deliberately. Do not expose internal chain-of-thought.
- Prioritize a clear desktop experience; make it responsive where practical.
- Keep the implementation focused: a small number of reliable scenarios is preferable to a broad, unfinished feature set.

## Project Commands

- `npm run dev` starts the Vite development server.
- `npm run build` runs TypeScript project checks and creates the production build.
- `npm run lint` runs ESLint.
- `npm test` runs the focused Vitest suite.

## Documentation

Keep the README focused on setup, stack, application structure, chat state, mock streaming/events, key decisions, limitations, future improvements, and the required AI-tools disclosure. Do not duplicate the full assignment here.

## Implementation Checkpoint

- Phase 1 is complete: responsive chat shell, typed Redux Toolkit conversation state, create/select/send-message flow, and validated `localStorage` persistence with user-facing warnings.
- Phase 2 is complete: typed local mock-agent with contextual replies, streamed text, a calculator tool flow, demonstrable errors, and retry.
- Per-conversation generation state and request-ID guards keep events attached to their originating request while switching chats. Interrupted persisted responses are recovered as retryable errors.
- Conversation deletion asks for confirmation, selects another conversation when needed, clears that conversation's generation state, and persists the new chat list.
- Calculator tool activity is stored on the assistant message so tool results remain visible after streaming completes.
- Phase 3 browser review passed in headless Edge at 1440px and 390px: calculator flow, errors and retry, long-input resizing, touch-visible deletion, deletion during generation, no horizontal overflow, and no uncaught JavaScript exceptions. Reduced-motion handling and the touch delete target were refined during review.
- Vitest covers mock-agent scenarios, retry behavior, stale events, conversation deletion, and interrupted-response recovery.
- `npm run build`, `npm run lint`, `npm test`, and `npm audit` pass.
- Next: prepare the requested short demo recording.
- Update this checkpoint and the README after each completed implementation phase. Keep the README's AI-tools examples factual; record concrete reviewed or rejected suggestions rather than inventing examples.
