# Frontend Architecture & Component Boundaries

## Layer Boundaries
1. **Component Layer (`src/components/`)**: Pure presentation components for rendering UI components, alerts, and forms.
2. **Page Layer (`src/App.tsx`, views)**: Top-level view layout and routing. Array filtering, sorting, and expensive state transformations MUST be memoized using `useMemo`.
3. **API Adapter Layer (`src/api/`)**: HTTP client functions, Server-Sent Events (SSE) reader streams, and backend integration. Must handle authentication securely (e.g. `Authorization: Bearer` headers) without leaking credentials in URL parameters.

## Automated Refactoring Rules
- **Accessibility**: Dynamic alert messages and notification banners must specify `role="alert"` and `aria-live="assertive"`.
- **Component Memoization**: Use `useMemo` for array filtering/sorting loops and `useCallback` for functions passed as props to heavy child components.
- **Test-Pairing Mandatory Directive**: Every PR introducing API adapter changes or component fixes MUST include updated unit tests in `tests/unit/`.
