---
description: Bootstrap and optimize CI runtime for Playwright E2E tests (setup first, then workers vs sharding vs matrix)
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Provide a repeatable, project-agnostic workflow to speed up CI E2E runs while keeping them stable.

This workflow focuses on:

- Choosing the right parallelization layer(s): Playwright `workers` vs Playwright `--shard` vs CI matrix jobs
- Avoiding common sharding/CLI pitfalls
- Producing actionable artifacts for debugging failures
- Tuning performance with measurable checkpoints

## How to Execute This Workflow

**⚠️ MANDATORY: AI MUST run the workflow-runner command below and follow its output.**

**DO NOT read the Steps section below and execute them manually.** The runner handles:

- Step sequencing and state tracking
- Nested workflow execution
- AI task delegation with proper context

```bash
deno run -A https://raw.githubusercontent.com/theplant/workflow-runner/HEAD/run.ts theplant.e2e-ci-optimization
```

Run this command, then follow the runner's instructions. The runner will tell you what to do next.

## Steps

### Step 1: Baseline and constraints (NON-NEGOTIABLE)

1. Identify the E2E runner and framework:

- If the project uses Playwright, locate:
  - `playwright.config.*`
  - the E2E script in `package.json` (usually `test:e2e`)

2. Capture a baseline (time and flakiness):

- Record:
  - total E2E wall time on CI
  - number of tests
  - retry count and failure types (timeouts vs assertions vs infra)

3. Record CI environment constraints:

- GitHub-hosted runners typically have limited CPU.
- Self-hosted runners vary; treat CPU/memory as tunables.

### Step 2: If E2E CI is missing, bootstrap a minimal setup

Use this step when the project has E2E tests but CI does not run them yet (or there are no E2E tests and you want to introduce the first smoke test).

1. Detect whether E2E CI already exists:

- Check for an existing workflow job that runs E2E (for example, `.github/workflows/ci.yml` containing `playwright`, `cypress`, or a `test:e2e` script).
- Check for an E2E script in `package.json`:
  - Example names: `test:e2e`, `e2e`, `pw:test`, `playwright:test`

2. Ensure the project can run E2E locally (minimum viable):

- The app can be started in CI:
  - Either a dev server (`npm run dev`) or a preview server (`npm run build` then `npm run preview`).
- A base URL is known and consistent.

3. Add a Playwright baseline if the project does not have it:

- Add dev dependency: `@playwright/test`
- Add a minimal `playwright.config.*`:
  - `testDir` points to the E2E folder (e.g. `tests/e2e`)
  - `webServer` starts the app server
  - Set `forbidOnly` and `retries` based on `process.env.CI`
  - Do NOT over-tune timeouts; prefer fixing test stability in code

4. Add a minimal E2E script in `package.json`:

- Example:
  - `test:e2e`: `playwright test`

5. Create a minimal GitHub Actions workflow (or extend existing CI workflow):

- Minimal E2E job template (adapt package manager and Node version to the project).
- Prefer `node-version-file` if the repo already has it.
- Node version source of truth priority:
  1) `package.json` (`engines.node`) if present
  2) `.nvmrc` or `.node-version` if present
  3) If none exist, pick an LTS (temporary) and add an explicit version source to the repo later
- Prefer using the project's package manager for `install` and Playwright `exec`.

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version-file: 'package.json'

      # If the project uses pnpm, add pnpm setup and enable caching.
      # If the project uses npm, remove pnpm setup and use npm cache.
      - uses: pnpm/action-setup@v4

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      # Optional but recommended: speeds up subsequent CI runs by avoiding re-downloading browsers.
      - name: Cache Playwright browsers
        uses: actions/cache@v4
        with:
          path: |
            ~/.cache/ms-playwright
          key: ${{ runner.os }}-ms-playwright-${{ hashFiles('pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-ms-playwright-

      - name: Install Playwright browsers
        run: pnpm exec playwright install chromium

      - name: Run E2E tests
        run: pnpm exec playwright test

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: test-results
          path: test-results/
          retention-days: 7
```

If the project uses npm instead of pnpm, use:

- `actions/setup-node@v4` with `cache: 'npm'`
- `npm ci`
- `actions/cache@v4` to cache `~/.cache/ms-playwright` (optional but recommended)
- `npx playwright install chromium`
- `npx playwright test`

If `playwright install chromium` fails on CI due to missing system libraries, prefer ONE of these fallbacks:

- Use `playwright install --with-deps chromium` (slower; installs OS packages each job).
- Use Playwright's official Docker image for CI (fast and stable because browsers + deps are preinstalled).

6. Only after the minimal E2E CI is green, proceed to optimization (sharding/workers).

### Step 3: Choose the parallelization strategy

Pick ONE primary strategy first. Add the second only if needed.

#### Strategy A: Single job, increase Playwright `workers`

Use this when:

- CI allows enough CPU
- Tests are stable under concurrency
- You want minimal CI config changes

Typical implementation:

- Configure `workers` via an env var (e.g. `PW_WORKERS`) with a safe default.
- Tune `PW_WORKERS` in CI (start at 2 on GitHub-hosted runners, increase only if stable).

#### Strategy B: Multi job, use Playwright sharding (`--shard`) + CI matrix

Use this when:

- Test suite is large
- Single runner is the bottleneck
- You can afford repeated setup per shard (install deps, install browsers, start server)

Typical implementation:

- GitHub Actions `strategy.matrix` to create N jobs.
- Each job runs `playwright test --shard=k/N`.
- Keep each shard stable using `PW_WORKERS=1` (recommended starting point).

### Step 4: Make Playwright `workers` configurable (recommended)

In `playwright.config.*`, set `workers` to:

- Use `PW_WORKERS` if present
- Else default to `1` on CI (stability)
- Else let Playwright decide locally

**Rule:** Prefer configurability over hardcoding to avoid edit/revert loops.

Why this matters (learned from real CI tuning):

- You can keep a **stable default** (`workers=1` on CI) while still being able to **tune without code changes** by only adjusting CI env.
- Different CI environments have different CPU budgets (GitHub-hosted vs self-hosted). One repo-level config should adapt via env.
- It avoids noisy PRs that only flip worker counts back and forth.

### Step 5: Implement CI sharding with GitHub Actions matrix

In `.github/workflows/*.yml` for E2E:

1. Add:

- `strategy.fail-fast: false` (recommended; avoids losing signal)
- `strategy.matrix` with shards

2. Run tests per shard:

- Prefer calling Playwright directly:

```bash
pnpm exec playwright test --shard=1/8
```

**Avoid:** `playwright test -- --shard=...` (extra `--` can be interpreted as test patterns).

3. Set stability env vars:

- Start with `PW_WORKERS: '1'` per shard

4. Artifact naming:

- Use slash-free artifact names (e.g. `1-of-8`) to avoid oddities in artifact naming/paths.

Recommended GitHub Actions matrix pattern:

- Use `matrix.include` to carry both:
  - `shard`: `k/N` (passed to `--shard`)
  - `shardName`: `k-of-N` (safe for artifact names)

### Step 6: Common pitfalls checklist (fix before tuning)

- CLI forwarding:
  - Ensure `--shard` is passed as a Playwright option, not a test filter.
- Port conflicts:
  - If shards run as separate jobs (matrix), ports are isolated.
  - If shards run on the same machine concurrently, each needs a distinct port.
- Data isolation:
  - Ensure each test gets its own browser context.
  - If you seed via localStorage, confirm your fixture clears localStorage per test.
- Flakiness after enabling parallelism:
  - Prefer fixing selectors/app race conditions over increasing timeouts.

### Step 7: Optional speedups (apply only after Step 5 is stable)

- Cache Playwright browsers between CI runs (depends on CI provider).
- Prefer `build + preview` server over `dev` server for stability if the app supports it.
- Split E2E into suites by tags (smoke vs full), and run smoke on every PR.

#### Cache Playwright browsers (GitHub Actions)

Playwright downloads browsers into a local cache directory (commonly `~/.cache/ms-playwright` on Linux).

- This cache improves performance mostly on the **2nd CI run and onwards**.
- With sharding via matrix jobs, each shard is a separate machine; caching still helps across workflow runs, but will NOT prevent all shards from downloading in a first-time cold run.

Recommended step (place it before `playwright install`):

```yaml
- name: Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: |
      ~/.cache/ms-playwright
    key: ${{ runner.os }}-ms-playwright-${{ hashFiles('pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-ms-playwright-
```

Verification:

- In GitHub Actions logs, `actions/cache` step should show **Cache restored** (hit) rather than **Cache not found** (miss).
- The `playwright install` step should become much faster and stop showing large downloads on cache hits.

#### Avoid `--with-deps` when possible

`playwright install --with-deps` may be significantly slower because it installs OS packages on every CI job.

Pragmatic recommendation:

- Start with `playwright install chromium`.
- If CI fails due to missing libraries, either:
  - switch back to `--with-deps`, or
  - use Playwright's official Docker image for a stable and fast environment.

### Step 8: Tune shard count (pragmatic guidance)

- Start with `N=4`.
- Increase to `N=8` only if:
  - tests are long enough that setup overhead is amortized, and
  - CI parallelism budget allows it.

Stop increasing shards when:

- total time stops decreasing, or
- flakiness increases, or
- CI queue time becomes dominant.

### Step 9: Verification and rollout

- Verify:
  - each shard finds and executes tests
  - total runtime improvement
  - failure diagnostics are still captured (traces, test-results, HTML dumps)

- Rollout:
  - land the CI change
  - monitor 5-10 PRs for flakiness and runtime
  - adjust shard count / workers based on evidence
