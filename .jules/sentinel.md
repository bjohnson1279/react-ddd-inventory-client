## 2024-05-18 - Auth Token Leaked in URL
**Vulnerability:** Sending auth tokens in URL query strings for SSE endpoints
**Learning:** SSE doesn't support custom headers easily, so it's a common anti-pattern to send tokens in URL parameters where they are logged in access logs, proxies, and browser history.
**Prevention:** Use a secure token exchange mechanism, like setting a secure HttpOnly cookie or using short-lived ticket endpoints specifically for SSE.

## 2025-02-14 - Removed hardcoded passwords in API adapters
**Vulnerability:** API adapters for Express and Laravel used hardcoded default passwords (`Password123!` and `SecurePassword123`) as fallbacks during login if a password was not provided, allowing potential authentication bypass or reliance on easily guessed defaults.
**Learning:** Hardcoded fallback credentials can inadvertently allow empty passwords to authenticate via known default values, particularly when reused during auto-setup blocks in E2E environments.
**Prevention:** Always throw an error if required authentication secrets like passwords are not provided, instead of using fallbacks. Validate parameters early.
