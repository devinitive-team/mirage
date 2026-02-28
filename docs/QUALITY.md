# Quality

Run this full baseline for every code change:

- `task build` passes.
- `task format` passes.
- `task lint` passes.
- `task test` passes.

For any UI or behavior change, also run interactive validation by driving the app in a browser:

1. Start the app: `task run` (server on `:2137`, frontend on `:3000`).

2. `agent-browser` scripted verification (required):
   - Open the app:
     `agent-browser open http://localhost:3000`
   - Wait for the page to fully load:
     `agent-browser wait --load networkidle`
   - Snapshot interactive elements to get refs:
     `agent-browser snapshot -i`
   - Exercise the changed flow with real interactions (click, fill, upload, etc.) and verify outcomes via `get text`, `is visible`, or screenshots.
   - **Re-snapshot after every navigation or DOM change** — refs are invalidated.
   - For file upload flows, use:
     `agent-browser upload @ref /path/to/test.pdf`
     then wait for processing and assert the document appears in the list.
   - For search/query flows, fill the search input and submit, then assert result text is present:
     `agent-browser wait --text "expected result"`
   - Capture a final screenshot for visual confirmation:
     `agent-browser screenshot`
   - Close when done:
     `agent-browser close`
