# wellfound-cli

CLI for browsing Wellfound's public role/location job pages (startup and tech jobs).

**Data source**: `/role/l/<role>/<location>`, `/role/r/<role>` (Next.js `__NEXT_DATA__` Apollo cache) and `/jobs/<id>-<slug>` (JSON-LD JobPosting).
**Authentication**: None. **Dependencies**: None (plain `bun` + `fetch`); `bun install` only pulls dev type defs.

> **Personal use only.** Wellfound's terms restrict automated access. Keep volume low, don't use it commercially or in bulk. The CLI does not bypass bot challenges.

```bash
bun install
bun run src/cli.ts search -q "Frontend Engineer" -l "India" --format table
bun run src/cli.ts detail https://wellfound.com/jobs/<id>-<slug> --format plain
bun run typecheck && bun run test   # test includes one live smoke test
```

See `../SKILL.md` for flags and `../url-reference.md` for parsing anchors.
