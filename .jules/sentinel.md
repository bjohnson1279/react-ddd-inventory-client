## 2024-05-18 - Auth Token Leaked in URL
**Vulnerability:** Sending auth tokens in URL query strings for SSE endpoints
**Learning:** SSE doesn't support custom headers easily, so it's a common anti-pattern to send tokens in URL parameters where they are logged in access logs, proxies, and browser history.
**Prevention:** Use a secure token exchange mechanism, like setting a secure HttpOnly cookie or using short-lived ticket endpoints specifically for SSE.

## 2025-02-14 - Removed hardcoded passwords in API adapters
**Vulnerability:** API adapters for Express and Laravel used hardcoded default passwords (`Password123!` and `SecurePassword123`) as fallbacks during login if a password was not provided, allowing potential authentication bypass or reliance on easily guessed defaults.
**Learning:** Hardcoded fallback credentials can inadvertently allow empty passwords to authenticate via known default values, particularly when reused during auto-setup blocks in E2E environments.
**Prevention:** Always throw an error if required authentication secrets like passwords are not provided, instead of using fallbacks. Validate parameters early.

## 2025-02-15 - Removed hardcoded API key in UI component
**Vulnerability:** A UI component (`LogisticsErpPanel.tsx`) initialized an `apiKey` state with a hardcoded mock value (`'mock-credential-secret'`) and displayed it in a plain text input field.
**Learning:** Hardcoded credentials in UI components are not only a security risk if the codebase is exposed, but they also encourage bad practices and could be inadvertently submitted if the user doesn't realize it's a mock value. Using a standard text input for API keys allows shoulder-surfing or screen-sharing leaks.
**Prevention:** Always initialize sensitive inputs to empty strings, forcing explicit user action. Use `type="password"` for any input field collecting tokens, API keys, or secrets to mask the input.

## 2026-08-05 - Auth Token Leaked in URL
**Vulnerability:** Sending auth tokens in URL query strings for SSE endpoints via `EventSource`.
**Learning:** SSE natively doesn't support custom headers easily, so it's a common anti-pattern to send tokens in URL parameters where they are logged in access logs, proxies, and browser history.
**Prevention:** Use a `fetch`-based stream reader with `Accept: text/event-stream` and an `Authorization` header to secure the token and read the event stream securely instead of using `EventSource`.

## 2024-05-20 - [Fix Missing Authorization Header on Logistics Fetch endpoints]
**Vulnerability:** Direct `fetch` calls to backend endpoints (`/api/shipping/quote`, `/api/shipping/label`, `/api/erp/sync`) in `LogisticsErpPanel.tsx` lacked the `Authorization` header, potentially allowing unauthenticated or unauthorized access to sensitive logistics and ERP operations.
**Learning:** Hardcoded or custom fallback `fetch` API calls in React components often miss global authentication interceptors typically present in wrappers like Axios or an API client singleton.
**Prevention:** Always verify that direct `fetch` calls inside React components retrieve and pass the required authentication token (e.g., from `localStorage`) via the `Authorization` header, or enforce the use of a centralized authenticated API client for all network requests.
