import { describe, expect, test } from "bun:test"
import { buildSearchUrl, htmlToText, parseJobDetail, parseSearchPage, slugify } from "../src/helpers"

const state = {
  "StartupResult:1": { __typename: "StartupResult", name: "Acme", highlightedJobListings: [{ __ref: "JobListingSearchResult:10" }] },
  "JobListingSearchResult:10": {
    id: "10", title: "Frontend Engineer", slug: "frontend-engineer", locationNames: ["Pune"], liveStartAt: 1791364380,
    remote: false, jobType: "full-time", compensation: "₹10L – ₹14L", yearsExperienceMin: 4,
  },
  "JobListingSearchResult:11": { id: "11", title: "Remote SWE", slug: "swe", locationNames: [], remote: true, liveStartAt: 1791364380 },
  "JobListingSearchResult:12": { id: "12" }, // malformed: skipped
}
const page = `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { apolloState: { data: state } } } })}</script></html>`

describe("parseSearchPage", () => {
  const cards = parseSearchPage(page)
  test("skips malformed entries, keeps the rest", () => {
    expect(cards.map((c) => c.id).sort()).toEqual(["10", "11"])
  })
  test("maps fields and null-fills missing values", () => {
    const c = cards.find((x) => x.id === "10")!
    expect(c).toMatchObject({ title: "Frontend Engineer", company: "Acme", location: "Pune", date: "2026-10-07", url: "https://wellfound.com/jobs/10-frontend-engineer", experienceMinYears: 4 })
    const r = cards.find((x) => x.id === "11")!
    expect(r).toMatchObject({ company: null, location: "Remote", compensation: null, remote: true })
  })
  test("no Next data -> empty", () => {
    expect(parseSearchPage("<html></html>")).toEqual([])
  })
})

describe("url building", () => {
  test("role/location and remote pages", () => {
    expect(slugify("Full Stack Engineer")).toBe("full-stack-engineer")
    expect(buildSearchUrl("Frontend Engineer", "New Delhi", 1)).toBe("https://wellfound.com/role/l/frontend-engineer/new-delhi")
    expect(buildSearchUrl("Frontend Engineer", "Remote", 2)).toBe("https://wellfound.com/role/r/frontend-engineer?page=2")
  })
})

describe("parseJobDetail", () => {
  const ld = { "@type": "JobPosting", title: "FE", hiringOrganization: { name: "Acme" }, datePosted: "2026-10-07T09:13:00Z", description: "<p>Hello&nbsp;<strong>world</strong><br>line &amp; two</p><ul><li>a</li></ul>", jobLocation: [{ address: { addressLocality: "Pune", addressCountry: "India" } }] }
  const html = `<script type="application/ld+json">${JSON.stringify(ld)}</script>`
  test("parses JSON-LD and converts the description to text", () => {
    const d = parseJobDetail(html, "10", "u")!
    expect(d).toMatchObject({ title: "FE", company: "Acme", location: "Pune, India", date: "2026-10-07" })
    expect(d.description).toBe("Hello world\nline & two\n\n- a")
  })
  test("no JobPosting -> null", () => {
    expect(parseJobDetail("<html></html>", "1", "u")).toBeNull()
  })
  test("htmlToText strips tags", () => {
    expect(htmlToText("<p>a</p><p>b</p>")).toBe("a\n\nb")
  })
})
