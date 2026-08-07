## 2024-08-01 - Dynamic Alert ARIA Roles
**Learning:** Found that dynamically injected alert notifications (e.g., success/error messages in `alert-box`) lacked the `role="alert"` attribute, meaning screen readers wouldn't automatically announce them when they appear.
**Action:** Ensure any conditionally rendered alert components include `role="alert"` and make sure dismiss buttons have clear `aria-label` attributes.
## 2024-05-18 - Keyboard Navigability in Custom Components
 **Learning:** Standard `div` elements acting as interactive components (like collapsible cards) are not natively keyboard accessible or screen reader friendly. They require explicit `role="button"`, `tabIndex={0}`, `aria-expanded`, and manual event handling for `Enter` and `Space` keys to behave like native buttons.
 **Action:** Always ensure that custom interactive components have equivalent keyboard access and ARIA roles applied if native HTML interactive elements (like `<button>` or `<a>`) cannot be used.

## 2024-05-24 - Missing Input Labels in React App
**Learning:** React form inputs without matching `id` and `htmlFor` attributes on their adjacent `<label>` elements break accessibility and screen reader support, even if wrapped properly visually. Relying on `aria-label` when a visible label exists is an anti-pattern as it does not allow users to click the label to focus the input.
**Action:** Always ensure every form `<input>` and `<select>` component in the codebase has a unique `id` attribute corresponding to the `htmlFor` property of its `<label>`.
## 2026-08-07 - Dynamic Alert ARIA Live Region Enhancement
**Learning:** Found that dynamic error alerts (using `role="alert"`) across several panel components lacked the `aria-live="assertive"` attribute. While `role="alert"` implies an assertive live region in modern screen readers, adding `aria-live="assertive"` explicitly ensures immediate and reliable announcements of critical error messages across all assistive technology variants.
**Action:** Always pair `role="alert"` with `aria-live="assertive"` when rendering dynamic error or status messages that require immediate user attention to maximize compatibility and explicitly signal the intended behavior.
