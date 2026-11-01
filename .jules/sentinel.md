## 2023-11-01 - Prevent URL Injection in Fetch calls
**Vulnerability:** Unencoded variables dynamically interpolated into URLs are present, e.g. `/api/approval/requests/${id}/decision` and `/api/lots/${action}`.
**Learning:** This can lead to URL Injection, Path Traversal, and related issues when URL parameters are not encoded.
**Prevention:** Always use `encodeURIComponent` when dynamically inserting variables into fetch paths or query parameters.
