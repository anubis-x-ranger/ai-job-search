import { describe, expect, test } from "bun:test"
import { runCLI } from "./helpers"
import { normalizeId } from "../src/commands/detail"

function errorOf(stderr: string): { error: string; code: string } {
  return JSON.parse(stderr)
}

describe("flag validation (no network)", () => {
  test("unknown flag exits 1 with JSON error on stderr", async () => {
    const r = await runCLI(["search", "-q", "Frontend Engineer", "-l", "India", "--bogus", "1"])
    expect(r.exitCode).toBe(1)
    expect(r.stdout).toBe("")
    expect(errorOf(r.stderr).code).toBe("UNKNOWN_FLAG")
  })
  test("missing --query", async () => {
    const r = await runCLI(["search", "-l", "India"])
    expect(r.exitCode).toBe(1)
    expect(errorOf(r.stderr).code).toBe("NO_QUERY")
  })
  test("missing --location", async () => {
    const r = await runCLI(["search", "-q", "Frontend Engineer"])
    expect(r.exitCode).toBe(1)
    expect(errorOf(r.stderr).code).toBe("NO_LOCATION")
  })
  test("--jobage must be a whole number >= 1", async () => {
    const r = await runCLI(["search", "-q", "x", "-l", "India", "--jobage", "0.5"])
    expect(r.exitCode).toBe(1)
    expect(errorOf(r.stderr).code).toBe("BAD_ARG")
  })
  test("detail rejects a bare id and other hosts", async () => {
    for (const input of ["4817670", "https://evil.example/jobs/4817670-x", "https://wellfound.com.evil.io/jobs/4817670-x"]) {
      const r = await runCLI(["detail", input])
      expect(r.exitCode).toBe(1)
      expect(errorOf(r.stderr).code).toBe("BAD_ID")
    }
  })
})

describe("normalizeId", () => {
  test("accepts URL and id-slug", () => {
    expect(normalizeId("https://wellfound.com/jobs/4817670-frontend-engineer")?.id).toBe("4817670")
    expect(normalizeId("wellfound.com/jobs/4817670-frontend-engineer")?.id).toBe("4817670")
    expect(normalizeId("4817670-frontend-engineer")?.path).toBe("4817670-frontend-engineer")
  })
  test("rejects others", () => {
    expect(normalizeId("4817670")).toBeNull()
    expect(normalizeId("https://linkedin.com/jobs/view/4817670")).toBeNull()
  })
})
