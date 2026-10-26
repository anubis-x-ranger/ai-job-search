// Data source: Wellfound's public role pages (/role/l/<role>/<location> and
// /role/r/<role>) and public job pages (/jobs/<id>-<slug>). No authentication.
// Role pages are Next.js pages: the listings sit in the __NEXT_DATA__ JSON
// (Apollo cache). Job pages carry a schema.org JobPosting in a JSON-LD block.
// Both are parsed with JSON.parse after a regex cut, so no HTML parser is needed.

export const BASE_URL = "https://wellfound.com"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA = "Mozilla/5.0 (compatible; wellfound-cli/1.0)"

/** Fetch HTML with exponential backoff on 429/5xx. Returns "" on a 404. */
export async function htmlFetch(url: string): Promise<string> {
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    })
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      }
      const jitter = Math.floor(Math.random() * 500)
      await new Promise((r) => setTimeout(r, delay + jitter))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 404) return ""
    if (response.status === 403) {
      throw new Error(
        "Request failed: 403 - Wellfound served a bot challenge or blocked the request. This CLI does not try to bypass it; wait and retry later, or use the website.",
      )
    }
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }
    return response.text()
  }
  throw new Error("Request failed after max retries")
}

export interface JobCard {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
  remote: boolean
  jobType: string | null
  compensation: string | null
  experienceMinYears: number | null
}

export interface JobDetail extends JobCard {
  description: string | null
  industry: string | null
  employmentType: string | null
  directApply: boolean | null
}

/** Lower-case kebab slug for role and location path segments. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function isRemoteLocation(location: string | undefined): boolean {
  return !!location && /^remote$/i.test(location.trim())
}

/** Build the role page URL. No location -> India-wide is NOT assumed; location is required by the CLI. */
export function buildSearchUrl(role: string, location: string, page: number): string {
  const r = slugify(role)
  const path = isRemoteLocation(location)
    ? `/role/r/${r}`
    : `/role/l/${r}/${slugify(location)}`
  return `${BASE_URL}${path}${page > 1 ? `?page=${page}` : ""}`
}

function extractNextData(html: string): any | null {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (!m) return null
  try {
    return JSON.parse(m[1])
  } catch {
    return null
  }
}

function epochToIso(epoch: unknown): string | null {
  if (typeof epoch !== "number" || !Number.isFinite(epoch)) return null
  const d = new Date(epoch * 1000)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

export function jobUrl(id: string, slug: string | null): string {
  return `${BASE_URL}/jobs/${id}${slug ? `-${slug}` : ""}`
}

/**
 * Parse the listings out of a role page. Each listing is a
 * JobListingSearchResult in the Apollo cache; company names come from the
 * StartupResult entries that reference the listing. A malformed entry is
 * skipped without affecting the others.
 */
export function parseSearchPage(html: string): JobCard[] {
  const data = extractNextData(html)
  const apollo = data?.props?.pageProps?.apolloState
  const state: Record<string, any> | undefined = apollo?.data ?? apollo
  if (!state || typeof state !== "object") return []

  const companyByListing = new Map<string, string>()
  for (const [key, val] of Object.entries(state)) {
    if (!key.startsWith("StartupResult:") || !val) continue
    const name = typeof val.name === "string" ? val.name : null
    if (!name) continue
    for (const ref of val.highlightedJobListings ?? []) {
      const refKey = ref?.__ref
      if (typeof refKey === "string") companyByListing.set(refKey, name)
    }
  }

  const cards: JobCard[] = []
  for (const [key, val] of Object.entries(state)) {
    if (!key.startsWith("JobListingSearchResult:")) continue
    try {
      const id = String(val.id ?? key.split(":")[1] ?? "")
      if (!id || typeof val.title !== "string") continue
      const names: string[] = Array.isArray(val.locationNames) ? val.locationNames : []
      const remote = val.remote === true || val.remoteConfig?.kind === "REMOTE"
      cards.push({
        id,
        title: val.title,
        company: companyByListing.get(key) ?? null,
        location: names.length ? names.join(", ") : remote ? "Remote" : null,
        date: epochToIso(val.liveStartAt),
        url: jobUrl(id, typeof val.slug === "string" ? val.slug : null),
        remote,
        jobType: typeof val.jobType === "string" ? val.jobType : null,
        compensation: typeof val.compensation === "string" ? val.compensation : null,
        experienceMinYears: typeof val.yearsExperienceMin === "number" ? val.yearsExperienceMin : null,
      })
    } catch {
      continue
    }
  }
  return cards
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => {
      const cp = parseInt(d, 10)
      return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
    })
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, h) => {
      const cp = parseInt(h, 16)
      return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
    })
    .replace(/&amp;/g, "&")
}

/** Convert the JSON-LD description HTML into readable plain text. */
export function htmlToText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h[1-6]|ul|ol)>/gi, "\n\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** Parse a job page's schema.org JobPosting JSON-LD block. */
export function parseJobDetail(html: string, id: string, fallbackUrl: string): JobDetail | null {
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    let ld: any
    try {
      ld = JSON.parse(m[1])
    } catch {
      continue
    }
    if (ld?.["@type"] !== "JobPosting") continue
    const places: any[] = Array.isArray(ld.jobLocation)
      ? ld.jobLocation
      : Array.isArray(ld.hiringOrganization?.location)
        ? ld.hiringOrganization.location
        : []
    const location = places
      .map((p) => [p?.address?.addressLocality, p?.address?.addressRegion, p?.address?.addressCountry].filter(Boolean).join(", "))
      .filter(Boolean)
      .join(" | ")
    const months = ld.experienceRequirements?.monthsOfExperience
    const salary = ld.baseSalary?.value
    const compensation =
      salary && (salary.minValue || salary.maxValue)
        ? `${ld.baseSalary.currency ?? ""} ${salary.minValue ?? "?"} - ${salary.maxValue ?? "?"}${salary.unitText ? ` / ${salary.unitText}` : ""}`.trim()
        : null
    return {
      id,
      title: String(ld.title ?? ""),
      company: ld.hiringOrganization?.name ?? null,
      location: location || null,
      date: typeof ld.datePosted === "string" ? ld.datePosted.slice(0, 10) : null,
      url: fallbackUrl,
      remote: ld.jobLocationType === "TELECOMMUTE",
      jobType: null,
      compensation,
      experienceMinYears: typeof months === "number" ? Math.round(months / 12) : null,
      description: typeof ld.description === "string" ? htmlToText(ld.description) : null,
      industry: typeof ld.industry === "string" ? ld.industry : null,
      employmentType: typeof ld.employmentType === "string" ? ld.employmentType : null,
      directApply: typeof ld.directApply === "boolean" ? ld.directApply : null,
    }
  }
  return null
}
