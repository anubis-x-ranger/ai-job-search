# Wellfound URL reference

Investigated 2026-10-26 with plain `fetch`/`curl` and an honest User-Agent
(`Mozilla/5.0 (compatible; wellfound-cli/1.0)`).

## Access

- `robots.txt` (`User-agent: *`) disallows `/search`, `/_jobs/`, `/auth/`, `/u/`, `/projects/`, `/jobs/applications`, `/jobs/signup`, and any URL carrying `?role=`, `?jobId=`, `?jobSlug=`, `?inFrame=`, `?preview=`. `/role/...` and `/jobs/<id>-<slug>` are not disallowed. The CLI never requests a disallowed path.
- No login needed for the pages below. The pages include a Cloudflare Turnstile script; no challenge was served at low volume. A 403 is surfaced as an error, never bypassed.

## Endpoints

| Purpose | URL |
|---------|-----|
| Role + location | `https://wellfound.com/role/l/<role-slug>/<location-slug>` (e.g. `/role/l/frontend-engineer/india`) |
| Remote role | `https://wellfound.com/role/r/<role-slug>` |
| Pagination | append `?page=<n>` (page 1 has no parameter) |
| Job page | `https://wellfound.com/jobs/<id>-<slug>` (404 without the slug or with a wrong one) |

## Search page structure

Next.js page. `<script id="__NEXT_DATA__">` -> `props.pageProps.apolloState` (sometimes under `.data`), an Apollo cache keyed by entity:

- `JobListingSearchResult:<id>`: `id`, `title`, `slug`, `locationNames[]`, `liveStartAt` (epoch seconds), `remote`, `remoteConfig.kind`, `jobType`, `compensation` (display string), `yearsExperienceMin/Max`, `description` (plain text with markdown).
- `StartupResult:<id>`: `name`, `slug`, `companySize`, `highlightedJobListings[]` (`{__ref: "JobListingSearchResult:<id>"}`). This is how a listing is tied to its company.
- Typical page: 24-30 listings.

## Job page structure

`<script type="application/ld+json">` holding a schema.org `JobPosting`: `title`, `hiringOrganization.name`, `jobLocation[].address`, `datePosted`, `employmentType`, `industry`, `directApply`, `experienceRequirements.monthsOfExperience`, `baseSalary`, and `description` as HTML.

## Quirks

- A role page can include related-role listings from the same company.
- Only `/role/...` pages are used for discovery because free-text search (`/search`) is disallowed.
