---
name: gh-weekly-closed-prs
description: Generate a weekly, grouped report of PRs closed by the authenticated GitHub user when asked for weekly PR summaries or release-note style reporting.
metadata:
  short-description: Weekly grouped closed PR report.
---

# GH Weekly Closed PRs

## Trigger

Use this skill when the user asks for a weekly closed PR report, weekly PR summary, or release-note style grouping of PRs closed by the authenticated GitHub user.

Example prompts:
- "Weekly closed PRs"
- "Give me a weekly PR summary grouped by theme"
- "Release-note style summary of PRs I closed this week"

## Inputs & defaults

- Default window: last 7 days (7*24 hours) relative to local time unless the user requests otherwise.
- If the user specifies a different window (for example, "last 14 days"), confirm the number of days and use it.
- Authenticated GitHub user from `gh api user`.
- Output file: `weekly-prs-YYYY-MM-DD.md` using the local report date.

## Preferred path: script (deterministic)

If `scripts/weekly_closed_prs.py` exists, run it to keep the output deterministic and compact:

```bash
python scripts/weekly_closed_prs.py --days 7
```

- Pass `--days N` when the user wants a different window.
- The script writes the report to `weekly-prs-YYYY-MM-DD.md` in the current working directory.
- If you already fetched data, you can reuse it:

```bash
python scripts/weekly_closed_prs.py --days 7 --input /tmp/closed_prs_pages.json
```

If the script is missing or fails, fall back to the manual workflow.

## Manual workflow

### 1) Verify auth and identify user

- Prefer gh CLI.
- If gh is unauthenticated, stop and explain: `gh auth login` is required.

```bash
LOGIN=$(gh api user --jq .login)
```

### 2) Compute time window (local timezone)

Compute the cutoff timestamp (now minus N days) and a date string for the search query. Use local time, not UTC, so the window reflects the user's timezone.
Replace `7` with `N` if the user requested a different window.

```bash
python - <<'PY'
from datetime import datetime, timedelta

now = datetime.now().astimezone()
cutoff = now - timedelta(days=7)
print(cutoff.isoformat(), cutoff.date().isoformat())
PY
```

Capture the two outputs into shell vars:

```bash
read -r CUTOFF_ISO CUTOFF_DATE < <(python - <<'PY'
from datetime import datetime, timedelta
now = datetime.now().astimezone()
cutoff = now - timedelta(days=7)
print(cutoff.isoformat(), cutoff.date().isoformat())
PY
)
```

### 3) Fetch PRs (preferred: gh API)

Use GitHub Search API via gh. Always request enough results to cover the week.

Query template:

```
is:pr author:<login> closed:>=<cutoff_date>
```

Example with pagination (GET only):

```bash
QUERY="is:pr author:${LOGIN} closed:>=${CUTOFF_DATE}"
gh api -X GET --paginate search/issues -f q="$QUERY" -f per_page=100 > /tmp/closed_prs_pages.json
```

Notes:
- Explicitly use `-X GET` + `-f` to avoid a POST request.

Fallback (direct REST API):
- Use `https://api.github.com/search/issues?q=<query>`
- Authenticate with a token (for example `GITHUB_TOKEN`).
- Paginate until all results are retrieved.

### 4) Filter, de-duplicate, and normalize

- Only include PRs whose `closed_at` >= cutoff_iso.
- De-duplicate by `html_url`.
- Collect fields: repo full name, title, number, html_url, closed_at, merged_at (optional), labels (optional), body (optional).
- Treat "closed" strictly by `closed_at`, even if merged.

If you can run Python, prefer the script for grouping/output:

```bash
python scripts/weekly_closed_prs.py --days 7 --input /tmp/closed_prs_pages.json
```

Otherwise, reproduce the same logic manually (repo mapping + keyword/label/body grouping).
When doing it manually, write the report to `weekly-prs-YYYY-MM-DD.md` (local date).

### 5) Sort and group

- ALWAYS sort PRs by `closed_at` descending in every output list.
- Group into semantic sections (prefer meaning over repo name) using:
  - explicit repo-to-group mapping
  - title keywords
  - labels or PR body when needed
- Each PR appears in exactly one group.
- Use a "Misc" group for leftovers.
- Order groups by number of PRs (largest first).

### 6) Output format (exact)

Only output grouped sections as nested bullets (no markdown headers).
Each PR line uses a markdown link on the PR number.

```
- <Group name> (<count>)
  - [owner/repo] <PR title> [#<number>](<PR url>)
```

Grouping sections only. For each group, list PRs in the same format and keep closed_at sorting. Example:

```
- Deployment tools & infra (5)
  - [owner/repo] Title [#123](https://github.com/org/repo/pull/123)
```

### 7) Final summary

End with a `Summary` bullet and nested bullets:
- `Total PRs closed: N`
- `Counts by group: A 3; B 2; Misc 1`
- `Merged vs not merged: X merged, Y closed unmerged`

## Failure handling

- Auth failure: explain that `gh auth login` is required.
- Search 404: ensure you used `-X GET` with `-f` (query params) for `search/issues`.
- Zero PRs: say so and show the exact query used.
- Script missing or errors: fall back to manual workflow.
