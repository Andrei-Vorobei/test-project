---
description: "Use when creating or changing React, TypeScript, CSS, or UI files for the LOM AI educational chat project."
applyTo: "src/**/*.{ts,tsx,css}"
---

# Frontend Implementation Guidelines

- Use functional React components and strict TypeScript types. Follow the existing ESLint and TypeScript configuration.
- Keep components focused on rendering and user interaction. Put chat state transitions in Redux Toolkit and mock-agent timing/event generation in a separate service or module.
- Model agent events and conversation/message states explicitly with discriminated unions where useful. Handle completion, errors, retries, and cancellation or stale events without silently losing state.
- Keep asynchronous work associated with its conversation so switching chats does not put streamed content in the wrong chat. Ensure a retry does not duplicate or corrupt messages.
- Make controls keyboard accessible, label inputs and icon-only buttons, and use semantic elements. Provide visible feedback for sending, processing, streaming, completion, and errors.
- Do not render internal model reasoning. Show only concise, user-facing progress such as analysis, tool use, or answer generation.
- Preserve the existing React Compiler and Vite setup. Avoid adding dependencies or abstractions unless they materially help satisfy the assignment.
- Verify frontend changes with `npm run lint` and `npm run build`; add focused tests when test tooling is available.
