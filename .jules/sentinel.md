## 2025-02-14 - Fix Unsanitized URL in Anchor Href (bolUrl)
**Vulnerability:** An unsanitized URL (`labelResult.bolUrl`) was rendered directly in an anchor tag's `href` attribute without checking the protocol.
**Learning:** This pattern allows for Cross-Site Scripting (XSS) if a malicious user provides a `javascript:`, `vbscript:`, or `data:` URI instead of an expected `http:` or `https:` URL.
**Prevention:** Always validate or sanitize URLs before using them in anchor tags. A simple protocol check (e.g., ensuring it starts with `http://` or `https://`) is an effective mitigation strategy.
