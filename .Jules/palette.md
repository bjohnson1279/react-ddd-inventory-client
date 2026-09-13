## 2026-09-13 - Missing label associations in custom dashboards
**Learning:** Found multiple instances where form inputs (`type="file"`, etc.) had visual labels without programmatic associations (missing `htmlFor` and `id`). This prevents users from clicking the label to trigger the file picker, limiting accessibility for users with motor impairments.
**Action:** When designing or updating custom form panels, always ensure `htmlFor` and `id` attributes explicitly link `<label>` elements to their corresponding `<input>` components.
