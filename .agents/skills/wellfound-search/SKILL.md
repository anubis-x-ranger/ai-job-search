---
name: wellfound-search
version: 1.0.0
description: >
  Use this skill to browse startup and tech job listings on Wellfound (formerly
  AngelList Talent) by role and location - India cities, countries or remote.
  Covers startups hiring software, frontend, full-stack, backend, data, AI,
  design and product roles with salary ranges when listed. Trigger phrases:
  Wellfound jobs, AngelList jobs, startup jobs, startup jobs in India,
  startup frontend jobs, remote startup jobs, look up this Wellfound posting.
context: fork
enabled: true  # set to false to keep this portal installed but have /scrape skip it
allowed-tools: Bash(bun run .agents/skills/wellfound-search/cli/src/cli.ts *)
---

# Wellfound Search Skill

Browse live listings from Wellfound's public **role pages** (`/role/l/<role>/<location>`,
`/role/r/<role>`) and read single postings from public **job pages** (`/jobs/<id>-<slug>`).
No authentication, no API key, zero runtime dependencies - it runs with just `bun`.

## ⚠️ Personal use only

Wellfound's terms restrict automated access. This CLI reads only public `/role/` and
`/jobs/` pages (never `/search`, which `robots.txt` disallows), stops at a bot challenge
instead of trying to get past it, and backs off on 429/5xx. **Keep volume low, don't use it
commercially or for bulk data collection, and run it on your own responsibility.**

## Not free-text search

Wellfound has no public keyword-search URL. `--query` is a **role** (e.g. "Frontend
Engineer", "Software Engineer", "Full Stack Engineer"), turned into the role slug in the
page URL. Role pages also list related roles (a "Frontend Engineer" page can show a
backend listing from the same company), so filter on the returned `title`. A role slug
Wellfound does not have returns a `NOT_FOUND` error.

## Commands

```bash
bun run .agents/skills/wellfound-search/cli/src/cli.ts search -q "<role>" -l "<city|country|Remote>" [flags]
bun run .agents/skills/wellfound-search/cli/src/cli.ts detail <url|id-slug> [--format json|plain]
```

| Flag | Meaning |
|------|---------|
| `--query, -q` | Role (required) |
| `--location, -l` | City, country (e.g. "India") or "Remote" (required). "Remote" is the worldwide remote page, mostly non-India employers |
| `--jobage <days>` | Keep listings posted within N days (client-side filter on the page's results) |
| `--page <n>` | 1-indexed page (about 25-30 results per page) |
| `--limit, -n <n>` | Cap results emitted |
| `--format` | `json` (default), `table`, `plain` |

`detail` needs the job URL from a search result (or `<id>-<slug>`): Wellfound returns 404
for a bare numeric ID.

## Examples

```bash
bun run .agents/skills/wellfound-search/cli/src/cli.ts search -q "Frontend Engineer" -l "India" --format table
bun run .agents/skills/wellfound-search/cli/src/cli.ts search -q "Software Engineer" -l "Bengaluru" --jobage 14 --format table
bun run .agents/skills/wellfound-search/cli/src/cli.ts search -q "Full Stack Engineer" -l "New Delhi" --limit 10
bun run .agents/skills/wellfound-search/cli/src/cli.ts search -q "Software Engineer" -l "Remote" --jobage 7
bun run .agents/skills/wellfound-search/cli/src/cli.ts detail https://wellfound.com/jobs/4817670-frontend-engineer --format plain
```

## Output

`search --format json` prints `{ "meta": { "count", "page" }, "results": [...] }`. Each result has
`id`, `title`, `company`, `location`, `date` (YYYY-MM-DD), `url`, plus `remote`, `jobType`,
`compensation` (as listed, e.g. "₹10L – ₹14L • No equity") and `experienceMinYears`.
Missing values are `null`. Errors go to stderr as `{ "error", "code" }` with exit code 1.

## Notes

- The role page returns a subset of listings, not the whole market; page through with `--page`.
- Locations use the slug Wellfound knows ("new-delhi", "bengaluru", "india"). An unknown location returns `NOT_FOUND`.
- Detail data comes from the page's schema.org JobPosting block; closed postings have no block and return `NOT_FOUND`.
- Endpoint and markup anchors are in `url-reference.md`.
