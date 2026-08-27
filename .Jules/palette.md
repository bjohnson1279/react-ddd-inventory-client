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
## 2024-05-15 - Missing ARIA Labels on Dismiss Buttons
**Learning:** Found multiple instances where error alerts had functional elements but lacked accessible "Dismiss" actions. Icon-only buttons used to dismiss alerts must always carry descriptive `aria-label` attributes to ensure screen readers can announce their purpose clearly.
**Action:** Always ensure that dynamically generated alerts feature a dismiss mechanism and that any icon-only actions within these alerts include explicit ARIA labels.
## 2024-08-25 - Explicit Button Types in Forms
**Learning:** Found that injecting generic `<button>` elements (such as dismiss icons in alert banners) inside or near form components defaults to `type="submit"`. Clicking them will accidentally submit the form and refresh the page, creating a confusing UX.
**Action:** Always explicitly define `type="button"` on interactive `<button>` elements that are not intended to trigger form submissions.
## 2026-08-26 - Proper association of labels to selects and tracking loading state for a11y\n**Learning:** In React components like `RFIDBulkScannerView.tsx`, it's important to associate `label`s with `select` or `input` components via `htmlFor` and `id` attributes instead of just relying on text proximity. Async `button`s should also track `aria-busy` to announce the loading state to screen readers and explicitly state `type="button"` to prevent implicit form submissions.\n**Action:** When evaluating forms or settings panels, explicitly check that each `label` has an `htmlFor` paired with an `id` on its input. Always attach `aria-busy` to buttons when a loading state exists.
## 2024-08-27 - Loading Buttons without aria-busy
**Learning:** Found multiple instances where buttons that trigger async operations (like form submissions or data fetching) had `disabled={loading}` but lacked `aria-busy={loading}`. Screen readers rely on `aria-busy` to announce that the system is processing something, which is a critical piece of feedback for accessibility.
**Action:** Always ensure that buttons triggering async actions have both `disabled={loading}` and `aria-busy={loading}` attributes applied to provide clear feedback to assistive technologies.
