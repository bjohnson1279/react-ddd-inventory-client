## 2024-08-01 - Dynamic Alert ARIA Roles
**Learning:** Found that dynamically injected alert notifications (e.g., success/error messages in `alert-box`) lacked the `role="alert"` attribute, meaning screen readers wouldn't automatically announce them when they appear.
**Action:** Ensure any conditionally rendered alert components include `role="alert"` and make sure dismiss buttons have clear `aria-label` attributes.
## 2024-05-18 - Keyboard Navigability in Custom Components
 **Learning:** Standard `div` elements acting as interactive components (like collapsible cards) are not natively keyboard accessible or screen reader friendly. They require explicit `role="button"`, `tabIndex={0}`, `aria-expanded`, and manual event handling for `Enter` and `Space` keys to behave like native buttons.
 **Action:** Always ensure that custom interactive components have equivalent keyboard access and ARIA roles applied if native HTML interactive elements (like `<button>` or `<a>`) cannot be used.
