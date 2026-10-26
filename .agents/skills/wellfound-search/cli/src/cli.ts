#!/usr/bin/env bun
// Self-contained CLI for browsing Wellfound's public role/location job pages.
// Zero runtime dependencies; runs anywhere `bun` is available.
//
// Personal use only. Wellfound's terms restrict automated access, so keep volume
// low and do not use this commercially or for bulk data collection. It reads only
// public /role/ and /jobs/ pages (never /search, which robots.txt disallows) and
// stops at a bot challenge rather than trying to get past it.

import { runSearch, type SearchOpts } from "./commands/search.js"
import { runDetail, type DetailOpts } from "./commands/detail.js"

interface Flags {
  _: string[]
  [k: string]: string | boolean | string[]
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { _: [] }
  const alias: Record<string, string> = { q: "query", l: "location", n: "limit" }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith("-")) {
      const key = alias[a.replace(/^-+/, "")] ?? a.replace(/^-+/, "")
      const next = argv[i + 1]
      if (next === undefined || next.startsWith("-")) {
        flags[key] = true
      } else {
        flags[key] = next
        i++
      }
    } else {
      ;(flags._ as string[]).push(a)
    }
  }
  return flags
}

const HELP = `wellfound-cli — browse Wellfound startup/tech job listings by role and location

USAGE
  bun run src/cli.ts search --query "<role>" --location "<city|Remote>" [flags]
  bun run src/cli.ts detail <url|id-slug> [--format json|plain]

SEARCH FLAGS
  --query, -q <role>      Role (REQUIRED). A Wellfound role, e.g. "Frontend Engineer",
                          "Software Engineer", "Full Stack Engineer". It is turned into the
                          role slug in the page URL; this is NOT free-text keyword search.
  --location, -l <place>  City or "Remote" (REQUIRED). e.g. "Bengaluru", "New Delhi", "India", "Remote".
  --jobage <days>         Keep listings posted within N days (client-side filter).
  --page <n>              1-indexed page. Default 1.
  --limit, -n <n>         Cap results emitted (client-side).
  --format <fmt>          json (default) | table | plain.

EXAMPLES
  bun run src/cli.ts search -q "Frontend Engineer" -l "India" --format table
  bun run src/cli.ts search -q "Software Engineer" -l "Bengaluru" --jobage 14 --format table
  bun run src/cli.ts search -q "Full Stack Engineer" -l "Remote" --limit 10
  bun run src/cli.ts detail https://wellfound.com/jobs/4817670-frontend-engineer --format plain

Personal use only - keep volume low.
`

const KNOWN_FLAGS: Record<string, Set<string>> = {
  search: new Set(["query", "location", "jobage", "page", "limit", "format", "help", "h"]),
  detail: new Set(["format", "help", "h"]),
}

function fail(error: string, code: string): number {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
  return 1
}

function wholeNumber(name: string, raw: string | boolean | string[]): number | null {
  const val = typeof raw === "string" ? Number(raw.trim()) : NaN
  if (!Number.isInteger(val) || val < 1) {
    fail(`--${name} must be a whole number of at least 1, got "${raw}"`, "BAD_ARG")
    return null
  }
  return val
}

async function main(): Promise<number> {
  const flags = parseFlags(process.argv.slice(2))
  const cmd = (flags._ as string[])[0]

  if (!cmd || flags.help || flags.h) {
    process.stdout.write(HELP)
    return cmd ? 0 : 1
  }

  const known = KNOWN_FLAGS[cmd]
  if (known) {
    for (const key of Object.keys(flags)) {
      if (key === "_" || known.has(key)) continue
      return fail(
        `unknown flag --${key} for '${cmd}' - flags are never silently ignored, because a discarded filter changes what the search returns; see --help for the supported flags`,
        "UNKNOWN_FLAG",
      )
    }
  }

  if (cmd === "search") {
    if (typeof flags.query !== "string" || !flags.query.trim()) {
      return fail('--query/-q is required, e.g. -q "Frontend Engineer"', "NO_QUERY")
    }
    if (typeof flags.location !== "string" || !flags.location.trim()) {
      return fail('--location/-l is required, e.g. -l "Bengaluru", -l "India" or -l "Remote"', "NO_LOCATION")
    }
    const fmt = flags.format !== undefined ? String(flags.format) : "json"
    if (!["json", "table", "plain"].includes(fmt)) {
      return fail(`--format must be one of json|table|plain, got "${fmt}"`, "BAD_ARG")
    }
    const nums: Record<string, number | undefined> = {}
    for (const name of ["jobage", "page", "limit"]) {
      if (flags[name] === undefined) continue
      const v = wholeNumber(name, flags[name])
      if (v === null) return 1
      nums[name] = v
    }
    const opts: SearchOpts = {
      role: flags.query,
      location: flags.location,
      jobage: nums.jobage,
      page: nums.page ?? 1,
      limit: nums.limit,
      format: fmt as SearchOpts["format"],
    }
    return runSearch(opts)
  }

  if (cmd === "detail") {
    const id = (flags._ as string[])[1]
    if (!id) return fail("detail requires a job URL or <id>-<slug>", "NO_ID")
    const fmt = flags.format !== undefined ? String(flags.format) : "json"
    if (!["json", "plain"].includes(fmt)) {
      return fail(`--format must be one of json|plain, got "${fmt}"`, "BAD_ARG")
    }
    const opts: DetailOpts = { id, format: fmt as DetailOpts["format"] }
    return runDetail(opts)
  }

  return fail(`Unknown command "${cmd}"`, "BAD_CMD")
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    process.stderr.write(JSON.stringify({ error: e instanceof Error ? e.message : String(e), code: "INTERNAL_ERROR" }) + "\n")
    process.exit(1)
  })
