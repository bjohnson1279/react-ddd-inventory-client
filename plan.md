1. **Understand the Issue**: The code at `src/App.tsx:579` uses `console.warn` to log an error when fetching cache stats fails. This is inconsistent with the rest of the file which uses `setMessage({ type: 'error', ... })` to show error messages to the user in the UI.
2. **Implement Fix**: We will replace the `console.warn('Failed to fetch cache stats:', err);` with `setMessage({ type: 'error', text: err.message || 'Failed to fetch cache stats.' });` using a node script that reads and updates the file.
3. **Verify the Fix**: Check the changes in `src/App.tsx` and run lint/tests to ensure everything still builds and runs correctly.
4. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**
5. **Submit a PR**: Create a Pull Request with the `submit` tool using the title and description required by the Code Health Agent directives.
