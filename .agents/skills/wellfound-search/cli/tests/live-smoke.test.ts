import { expect, test } from "bun:test"
import { runCLI, parseJSON } from "./helpers"

// Live: needs network access to wellfound.com. Keep to a couple of requests.
test("live search returns real results and detail works", async () => {
  const r = await runCLI(["search", "-q", "Frontend Engineer", "-l", "India", "--limit", "3"])
  const out = parseJSON<{ meta: { count: number }; results: { id: string; title: string; url: string }[] }>(r)
  expect(out.results.length).toBeGreaterThan(0)
  for (const j of out.results) {
    expect(j.id).toBeTruthy()
    expect(j.title).toBeTruthy()
    expect(j.url.startsWith("https://wellfound.com/jobs/")).toBe(true)
  }
  const d = parseJSON<{ title: string; description: string | null }>(await runCLI(["detail", out.results[0].url]))
  expect(d.title).toBeTruthy()
  expect(d.description).toBeTruthy()
})
