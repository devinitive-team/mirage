# Quality

Run this full baseline for every code change:

- `task build` passes.
- `task format` passes.
- `task lint` passes.
- `task typecheck` passes.
- `task test` passes.

When a change touches only `marketing/`, still run:

- `task marketing:build` passes.

For `marketing/` page work, iterate with this loop while implementing:

Prerequisite: Astro 5 requires Node.js `>=18.20.8` for `marketing` dev/build commands.

1. Start the marketing app in watch mode:
   `cd marketing && npm run dev`
2. Validate the current change with `agent-browser` against `http://localhost:4321`.
3. Apply the next set of edits and repeat this dev + browser check loop.
4. Before handoff, run a production build:
   `cd marketing && npm run build` (or `task marketing:build`)

For `video/` work, iterate with this closed loop while implementing:

1. Start Remotion Studio in watch mode:
   `cd video && npm run dev` (or `task video:studio`).
2. Validate the current change in Studio timeline playback and composition controls.
3. Render the current state to a deterministic artifact:
   `task video:render` (outputs `video/out/promo.mp4`).
4. Evaluate the rendered file end-to-end in a media player (timing, transitions, text readability, motion continuity).
5. Repeat the Studio + render + evaluation cycle until output is correct.

Before handoff on `video/` changes, run:

- `task video:validate` (runs `task video:lint`, `task video:build`, and `task video:render`)

For any UI or behavior change, also run interactive validation by driving the app in a browser:

1. Start the app: `task run` (server on `:2137`, `web` on `:3000`, `marketing` on `:4321`).

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
   - For query flows, fill the query input and submit, then assert result text is present:
     `agent-browser wait --text "expected result"`
   - Capture a final screenshot for visual confirmation:
     `agent-browser screenshot`
   - Close when done:
     `agent-browser close`

For `marketing/` page changes, run this minimum scripted `agent-browser` check:

1. Open the marketing app:
   `agent-browser open http://localhost:4321`
2. Wait for load completion:
   `agent-browser wait --load networkidle`
3. Validate key visible content and CTA text (for example `Join Waitlist`) with `get text` / `is visible`.
4. Capture a screenshot:
   `agent-browser screenshot`
5. Close the browser:
   `agent-browser close`

For backend CORS changes, add this API smoke check:

1. Start server with an explicit origin allowlist in `srv/.env`, for example:
   `CORS_ALLOWED_ORIGINS=http://localhost:3000`
2. Verify preflight from an allowed origin:
   `curl -i -X OPTIONS http://localhost:2137/health -H 'Origin: http://localhost:3000' -H 'Access-Control-Request-Method: GET'`
3. Verify disallowed origin does not receive `Access-Control-Allow-Origin`:
   `curl -i -X OPTIONS http://localhost:2137/health -H 'Origin: http://evil.example' -H 'Access-Control-Request-Method: GET'`
