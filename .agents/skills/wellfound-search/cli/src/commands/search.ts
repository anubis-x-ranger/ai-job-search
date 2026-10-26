import { buildSearchUrl, htmlFetch, parseSearchPage, writeError, type JobCard } from "../helpers.js"

export interface SearchOpts {
  role: string
  location: string
  jobage?: number
  page: number
  limit?: number
  format: "json" | "table" | "plain"
}

function renderTable(cards: JobCard[]): string {
  if (cards.length === 0) return "No results."
  const header =
    "ID".padEnd(9) + " " + "TITLE".padEnd(36) + " " + "COMPANY".padEnd(22) + " " + "LOCATION".padEnd(22) + " " + "DATE".padEnd(10) + " COMP"
  const rows = cards.map(
    (c) =>
      `${c.id.padEnd(9)} ${c.title.slice(0, 36).padEnd(36)} ${(c.company || "—").slice(0, 22).padEnd(22)} ${(c.location || "—").slice(0, 22).padEnd(22)} ${(c.date || "—").padEnd(10)} ${c.compensation || "—"}`,
  )
  return [header, "-".repeat(header.length + 12), ...rows].join("\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const html = await htmlFetch(buildSearchUrl(opts.role, opts.location, opts.page))
    if (!html) {
      writeError(`No Wellfound page for role "${opts.role}" in "${opts.location}" (use a Wellfound role slug such as frontend-engineer)`, "NOT_FOUND")
      return 1
    }
    let cards = parseSearchPage(html)
    if (cards.length === 0) {
      writeError("The page loaded but no listings were found - Wellfound may have changed its markup or served a challenge page", "NO_RESULTS_PARSED")
      return 1
    }
    if (opts.jobage !== undefined) {
      const cutoff = Date.now() - opts.jobage * 86400000
      cards = cards.filter((c) => c.date !== null && new Date(c.date).getTime() >= cutoff)
    }
    if (opts.limit !== undefined) cards = cards.slice(0, opts.limit)

    if (opts.format === "table") {
      process.stdout.write(renderTable(cards) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(
        cards
          .map((c) => `${c.title}\n  ${c.company || "—"} · ${c.location || "—"} · ${c.date || "—"}${c.compensation ? ` · ${c.compensation}` : ""}\n  id: ${c.id}\n  ${c.url}`)
          .join("\n\n") + "\n",
      )
    } else {
      process.stdout.write(JSON.stringify({ meta: { count: cards.length, page: opts.page }, results: cards }, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}
