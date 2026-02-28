#!/usr/bin/env python3
import argparse
import json
import subprocess
import sys
from collections import defaultdict
from datetime import datetime, timedelta
from urllib.parse import urlsplit


def run(cmd, check=True):
    result = subprocess.run(cmd, capture_output=True, text=True)
    if check and result.returncode != 0:
        msg = result.stderr.strip() or result.stdout.strip()
        if msg:
            sys.stderr.write(msg + "\n")
        else:
            sys.stderr.write(f"Command failed: {' '.join(cmd)}\n")
        raise SystemExit(result.returncode or 1)
    return result.stdout


def get_login():
    return run(["gh", "api", "user", "--jq", ".login"]).strip()


def iter_json_objects(text):
    decoder = json.JSONDecoder()
    idx = 0
    length = len(text)
    while True:
        while idx < length and text[idx].isspace():
            idx += 1
        if idx >= length:
            break
        obj, idx = decoder.raw_decode(text, idx)
        yield obj


def extract_items(text):
    items = []
    for obj in iter_json_objects(text):
        if isinstance(obj, list):
            items.extend(obj)
            continue
        if isinstance(obj, dict) and isinstance(obj.get("items"), list):
            items.extend(obj["items"])
        else:
            items.append(obj)
    return items


def parse_dt(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def repo_from_url(url):
    try:
        parts = urlsplit(url).path.strip("/").split("/")
        if len(parts) >= 2:
            return f"{parts[0]}/{parts[1]}"
    except Exception:
        pass
    return "unknown/unknown"


def group_for(record):
    repo = record["repo"]
    title = record["title"].lower()
    body = (record.get("body") or "").lower()
    labels = [label.lower() for label in record.get("labels", [])]

    if repo == "grafana/deployment_tools":
        return "Deployment tools & infra"
    if repo == "grafana/grafana-sessionreplay-app":
        return "Session Replay app"
    if (
        repo == "grafana/app-o11y-kwl-endpoint"
        or "sessionreplay" in title
        or "sessionreplay" in body
        or "sessionreplay" in labels
    ):
        return "Session Replay backend"
    return "Misc"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=7)
    parser.add_argument(
        "--input",
        help="Path to JSON output from gh api --paginate search/issues",
    )
    parser.add_argument("--login", help="Override GitHub login")
    parser.add_argument(
        "--output",
        help="Output markdown path (defaults to weekly-prs-YYYY-MM-DD.md)",
    )
    args = parser.parse_args()

    now = datetime.now().astimezone()
    cutoff = now - timedelta(days=args.days)
    cutoff_date = cutoff.date().isoformat()
    report_date = now.date().isoformat()

    login = args.login or get_login()
    if not login:
        sys.stderr.write("gh auth required; run: gh auth login\n")
        return 1

    query = f"is:pr author:{login} closed:>={cutoff_date}"

    if args.input:
        try:
            with open(args.input, "r", encoding="utf-8") as handle:
                text = handle.read()
        except OSError as exc:
            sys.stderr.write(f"Failed to read {args.input}: {exc}\n")
            return 1
    else:
        cmd = [
            "gh",
            "api",
            "-X",
            "GET",
            "--paginate",
            "search/issues",
            "-f",
            f"q={query}",
            "-f",
            "per_page=100",
        ]
        text = run(cmd)

    items = extract_items(text)

    records = []
    seen = set()
    for item in items:
        if not isinstance(item, dict):
            continue
        closed_at = item.get("closed_at")
        if not closed_at:
            continue
        try:
            closed_dt = parse_dt(closed_at)
        except Exception:
            continue
        if closed_dt < cutoff:
            continue
        url = item.get("html_url")
        if not url or url in seen:
            continue
        seen.add(url)
        labels = [
            label.get("name", "").strip()
            for label in (item.get("labels") or [])
            if isinstance(label, dict)
        ]
        records.append(
            {
                "repo": repo_from_url(url),
                "title": (item.get("title") or "").strip(),
                "number": item.get("number"),
                "url": url,
                "closed_at": closed_at,
                "closed_dt": closed_dt,
                "merged_at": (item.get("pull_request") or {}).get("merged_at"),
                "labels": labels,
                "body": item.get("body") or "",
            }
        )

    records.sort(key=lambda record: record["closed_dt"], reverse=True)

    grouped = defaultdict(list)
    for record in records:
        grouped[group_for(record)].append(record)

    groups = sorted(grouped.items(), key=lambda pair: (-len(pair[1]), pair[0]))

    merged = sum(1 for record in records if record["merged_at"])
    output_lines = []

    if not records:
        output_lines.append("- Summary")
        output_lines.append("  - No PRs closed in the window.")
        output_lines.append(f"  - Query: {query}")
        output_lines.append("  - Total PRs closed: 0")
        output_lines.append("  - Counts by group: (none)")
        output_lines.append(
            "  - Merged vs not merged: 0 merged, 0 closed unmerged"
        )
    else:
        for group_name, recs in groups:
            output_lines.append(f"- {group_name} ({len(recs)})")
            for rec in recs:
                output_lines.append(
                    f"  - [{rec['repo']}] {rec['title']} [#{rec['number']}]({rec['url']})"
                )

        output_lines.append("- Summary")
        output_lines.append(f"  - Total PRs closed: {len(records)}")
        if groups:
            output_lines.append(
                "  - Counts by group: "
                + "; ".join([f"{name} {len(recs)}" for name, recs in groups])
            )
        else:
            output_lines.append("  - Counts by group: (none)")
        output_lines.append(
            f"  - Merged vs not merged: {merged} merged, {len(records) - merged} closed unmerged"
        )

    output = "\n".join(output_lines) + "\n"
    output_path = args.output or f"weekly-prs-{report_date}.md"
    with open(output_path, "w", encoding="utf-8") as handle:
        handle.write(output)
    print(output, end="")


if __name__ == "__main__":
    raise SystemExit(main())
