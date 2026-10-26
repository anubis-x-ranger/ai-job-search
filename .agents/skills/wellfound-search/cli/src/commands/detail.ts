import { BASE_URL, htmlFetch, parseJobDetail, writeError } from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

const WELLFOUND_HOST = /^(www\.)?wellfound\.com$/i

/**
 * Accept an "<id>-<slug>" path segment or a wellfound.com job URL (the "url"
 * field of a search result). A bare numeric ID is rejected: Wellfound answers
 * 404 unless the slug is present. A URL on any other host is rejected (host
 * read via URL parsing, so look-alike hosts fall on the reject side).
 */
export function normalizeId(input: string): { id: string; path: string } | null {
  const trimmed = input.trim()
  const slug = trimmed.match(/^(\d{5,})-[a-z0-9-]+$/i)
  if (slug) return { id: slug[1], path: trimmed }
  const hasScheme = /^https?:\/\//i.test(trimmed)
  if (hasScheme || /^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(trimmed)) {
    let parsed: URL
    try {
      parsed = new URL(hasScheme ? trimmed : `https://${trimmed}`)
    } catch {
      return null
    }
    if (!WELLFOUND_HOST.test(parsed.hostname)) return null
    const m = parsed.pathname.match(/^\/jobs\/((\d{5,})(?:-[a-z0-9-]+)?)\/?$/i)
    return m ? { id: m[2], path: m[1] } : null
  }
  return null
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const norm = normalizeId(opts.id)
  if (!norm) {
    writeError(
      `Could not parse a Wellfound job URL from "${opts.id}" - pass the "url" from a search result (https://wellfound.com/jobs/<id>-<slug>) or "<id>-<slug>"; a bare ID returns 404 on Wellfound`,
      "BAD_ID",
    )
    return 1
  }
  try {
    const url = `${BASE_URL}/jobs/${norm.path}`
    const html = await htmlFetch(url)
    if (!html) {
      writeError("Job not found", "NOT_FOUND")
      return 1
    }
    const job = parseJobDetail(html, norm.id, url)
    if (!job) {
      writeError("The job page loaded but no JobPosting data was found - the posting may be closed or the markup changed", "NOT_FOUND")
      return 1
    }
    if (opts.format === "plain") {
      const lines = [
        job.title,
        `${job.company || "—"} · ${job.location || "—"}`,
        "",
        job.employmentType ? `Employment: ${job.employmentType}` : "",
        job.experienceMinYears !== null ? `Experience: ${job.experienceMinYears}+ years` : "",
        job.compensation ? `Compensation: ${job.compensation}` : "",
        job.industry ? `Industry: ${job.industry}` : "",
        job.date ? `Posted: ${job.date}` : "",
        "",
        job.description || "(no description)",
        "",
        `URL: ${job.url}`,
      ].filter((l, i, a) => l !== "" || (i > 0 && a[i - 1] !== ""))
      process.stdout.write(lines.join("\n") + "\n")
    } else {
      process.stdout.write(JSON.stringify(job, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
