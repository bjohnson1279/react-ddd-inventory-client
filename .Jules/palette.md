## 2024-08-01 - Dynamic Alert ARIA Roles
**Learning:** Found that dynamically injected alert notifications (e.g., success/error messages in `alert-box`) lacked the `role="alert"` attribute, meaning screen readers wouldn't automatically announce them when they appear.
**Action:** Ensure any conditionally rendered alert components include `role="alert"` and make sure dismiss buttons have clear `aria-label` attributes.
## 2024-05-18 - Keyboard Navigability in Custom Components
 **Learning:** Standard `div` elements acting as interactive components (like collapsible cards) are not natively keyboard accessible or screen reader friendly. They require explicit `role="button"`, `tabIndex={0}`, `aria-expanded`, and manual event handling for `Enter` and `Space` keys to behave like native buttons.
 **Action:** Always ensure that custom interactive components have equivalent keyboard access and ARIA roles applied if native HTML interactive elements (like `<button>` or `<a>`) cannot be used.

## 2024-05-24 - Missing Input Labels in React App
**Learning:** React form inputs without matching `id` and `htmlFor` attributes on their adjacent `<label>` elements break accessibility and screen reader support, even if wrapped properly visually. Relying on `aria-label` when a visible label exists is an anti-pattern as it does not allow users to click the label to focus the input.
**Action:** Always ensure every form `<input>` and `<select>` component in the codebase has a unique `id` attribute corresponding to the `htmlFor` property of its `<label>`.
## 2024-08-09 - Ensure Temporary Files Are Not Committed
**Learning:** Found that running scripts and package managers can leave artifacts that accidentally get added to commits. This clutters up pull requests and violates constraints (e.g. max lines).
**Action:** Make sure to run `git rm -f` on any created scratch scripts or lockfiles that shouldn't be added.
## 2026-08-17 - Adding aria-labels to buttons
**Learning:** Found multiple instances where buttons had actions like "Delete" or "Copy cURL" but no specific `aria-label` to identify what item they applied to. This is especially important for repeated items in lists or tables, where a screen reader user might encounter multiple "Delete" buttons without knowing which item each deletes.
**Action:** Always include an `aria-label` on repeated action buttons (like delete or edit) that includes a unique identifier or name for the item being acted upon (e.g., `aria-label="Delete warehouse location ${loc.id}"`).
