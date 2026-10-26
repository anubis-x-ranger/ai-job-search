# Search Queries for Job Scraper

<!-- SETUP: Customize these queries based on your skills, target roles, and location -->

## Installed portal CLIs (primary for `/scrape`)

`/scrape` discovers every portal skill under `.agents/skills/*/SKILL.md` and runs its CLI first. Shipped country-agnostic CLIs include `linkedin-search` and `freehire-search`; Danish demos and any skill you add with `/add-portal` are included the same way. You do **not** need a matching `site:` line below for those CLIs to run.

The `site:` query templates in this file are the **WebSearch fallback** — for portals without a CLI, company career pages, or when a CLI fails.

**Language scope:** write every query category in every language listed in your CLAUDE.md Languages table (typically 1-2, sometimes more). A posting requiring a language you have *not* declared, as a job condition, is excluded before scoring; a posting requiring a *higher level* than you declared in a language you *do* work in is flagged for your own judgment, not excluded — see `04-job-evaluation.md`'s Language Gate, the single source of truth for this rule. Translate each category's keywords rather than machine-translating word-for-word (e.g. "Frontend Developer" -> "Desarrollador Frontend", not a literal word-for-word translation) if you work in more than one language.

## Search Sites

Primary:
- **linkedin.com/jobs** - LinkedIn job listings (India and remote); also covered by the `linkedin-search` CLI
- **freehire-search** CLI - country-agnostic aggregator
- India-specific boards (e.g. Naukri, Instahyre, Wellfound): add with `/add-portal`

Secondary (company career pages via Google):
- Direct Google searches with `site:` filters for target companies

## Query Categories

Write queries in English (the only declared language). Name categories by function; list several title variants.

### Priority 1: Frontend / Full-stack engineering (React, TypeScript)

```
site:linkedin.com/jobs "Frontend Engineer" React TypeScript India
site:linkedin.com/jobs "Software Engineer" React TypeScript fintech
site:linkedin.com/jobs "Full Stack Developer" React Node.js remote India
site:linkedin.com/jobs "SDE 2" React TypeScript
```

### Priority 2: Finance / fintech / private equity technology

```
site:linkedin.com/jobs React TypeScript fintech India
site:linkedin.com/jobs "private equity" software engineer React
site:linkedin.com/jobs "investment platform" frontend engineer
```

### Priority 3: AI agent and developer-automation engineering

```
site:linkedin.com/jobs "AI engineer" agents LLM TypeScript India
site:linkedin.com/jobs "developer productivity" engineer automation
site:linkedin.com/jobs "LLM" application engineer React
```

### Priority 4: Performance and test-automation engineering

```
site:linkedin.com/jobs "frontend performance" engineer Lighthouse
site:linkedin.com/jobs "SDET" Playwright TypeScript
site:linkedin.com/jobs "Software Engineer" Playwright React
```

## Location Filter

Open to relocation and remote. Tiers:
- Ideal: Remote (India-based or global), New Delhi / NCR (Gurugram, Noida)
- Acceptable: Bengaluru, Mumbai, Pune, Hyderabad (relocation open)
- Borderline: Roles abroad - check visa/sponsorship (Eligibility Gate) before scoring
- Too far: None defined

Target sectors: tech, finance, fintech, service and product companies, digital media. Salary baseline 16 LPA (current 12 LPA); notice period 60 days.

## Language Filter

Your working languages and levels are in CLAUDE.md's Languages table. When filtering scraped results, apply `04-job-evaluation.md`'s Language Gate: a posting requiring a language you haven't declared at all is excluded; a posting requiring a higher level than you declared in a language you do work in is not excluded, flag it clearly instead (see `job-scraper/SKILL.md`'s Step 3 "Quick Fit Assessment" for how the flag surfaces in `/scrape` output). Postings simply *written* in a language you don't work in, that don't require it on the job, are fine.

## Date Filter

Only include jobs posted within the last 14 days, or with an application deadline that has not yet passed. If a posting date cannot be determined, include it but flag as "date unknown".

## Adapting Queries

If the user specifies a focus area, select queries from the matching category and also generate 2-3 custom queries for that focus. For example:
- "/scrape [focus_area]" -> relevant category queries + custom focus-specific queries
