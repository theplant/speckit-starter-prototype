---
description: Deploy a SPA to S3 with stable entry + versioned assets + rollback
---

# S3 Versioned SPA Deploy

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Retrofit a SPA (e.g. Vite/React) to support:

- **Stable entry URL** under `/<base_path>/`.
- **Versioned immutable artifacts** uploaded to `/<base_path>/versions/<sha>/`.
- **Deploy** = promote a chosen `<sha>` to become the live entry.
- **Rollback** = promote an older `<sha>`.
- **Correct caching** (immutable hashed assets; no-cache for entry/metadata).
- **Debuggability** via `current.json` and GitHub Actions UI (run-name + summary).

## How to Execute This Workflow

**⚠️ MANDATORY: AI MUST run the workflow-runner command below and follow its output.**

**DO NOT** read the Steps section below and execute them manually.

```bash
deno run -A https://raw.githubusercontent.com/theplant/workflow-runner/HEAD/run.ts theplant.s3-versioned-spa-deploy
```

Run this command at the **target repo root**, then follow the runner's instructions.

## Critical Rules (NON-NEGOTIABLE)

### 1) Base path separation

- **Routing MUST use `VITE_APP_BASE_PATH`** (stable entry path).
- **Vite `base` MUST use `VITE_ASSET_BASE_PATH`** (versioned asset path).
- Once `VITE_ASSET_BASE_PATH` becomes versioned, **do not use `import.meta.env.BASE_URL` for router basepath**.

### 2) Promote safety (never delete versions)

- **Do not** run `aws s3 sync <versions/<sha>> <base_path> --delete` when `<base_path>` also contains `versions/`.
- Preferred promote strategy (A): keep all heavy files only under `versions/<sha>/` and copy only entry/root files to live.

### 3) Reusable workflow calling rules (GitHub Actions)

- When calling a reusable workflow (`jobs.<job>.uses`), **do not pass `${{ env.* }}` in `with:`**.
  - Put stable values into `workflow_call.inputs.default`.
  - Callers pass only the variable part (usually `sha`).

### 4) Cache-control rules

- `dist/assets/*` (hashed): `public, max-age=31536000, immutable`
- `dist/images/*`: use a short TTL unless URLs are guaranteed versioned
- Entry/metadata (`index.html`, `mockServiceWorker.js`, `current.json`): `no-cache`

### 5) GitHub UI visibility

- Deploy MUST set `run-name: Deploy ${{ github.sha }}`.
- Rollback MUST set `run-name: Rollback to ${{ inputs.sha }}`.
- Promote MUST write a Summary showing “From SHA → To SHA” via `$GITHUB_STEP_SUMMARY`.

### 6) Workflow visibility in GitHub UI

- A workflow can only be manually run from GitHub UI if the workflow file exists on the **default branch**.

## Anti-patterns (DO NOT DO THIS)

- **Mixing app base and asset base**: using a single base for both routing and assets once assets are versioned.
- **Promote by syncing the whole version directory to live**: `aws s3 sync ... --delete` at `/<base_path>/` scope.
- **Relying on `${{ env.* }}` inside reusable-workflow `with:`**.
- **Leaving live `/<base_path>/assets` forever**: causes growth over time; prefer strategy A (entry-only).

## Steps

### Step 0: Fill required inputs for the target project

Define these values before making changes:

- `BASE_PATH` (no leading/trailing slash), e.g. `iam`
- `VERSIONS_DIR`, e.g. `versions`
- `BUCKET`
- `AWS_REGION`
- `AWS_ROLE` (OIDC IAM role name, not ARN)
- `DEPLOY_BRANCH` (optional)
- `IMAGES_TTL_SECONDS` (recommended default: `86400`)

### Step 1: App refactor (stable routing base vs versioned asset base)

1. Add envs to `.env.example`:
   - `VITE_APP_BASE_PATH=/<base_path>/`
   - `VITE_ASSET_BASE_PATH=/<base_path>/versions/<sha>/`

2. Vite config (`vite.config.ts`):
   - set `base` from `VITE_ASSET_BASE_PATH`
   - ensure it ends with `/`

3. Router basepath (e.g. `src/main.tsx` / router init):
   - set router `basepath` to `VITE_APP_BASE_PATH`
   - avoid using `import.meta.env.BASE_URL` for router basepath once Vite `base` becomes versioned

4. URL builders / redirects (project-specific):
   - use `VITE_APP_BASE_PATH` for internal links and redirects

5. MSW (if used):
   - make the SW script load from `/<base_path>/mockServiceWorker.js`

### Step 2: CI deploy (build + upload versioned artifacts)

Create/refactor `.github/workflows/deploy.yml`:

1. Add `run-name: Deploy ${{ github.sha }}`.
2. Build with:
   - `VITE_APP_BASE_PATH=/<base_path>/`
   - `VITE_ASSET_BASE_PATH=/<base_path>/versions/${{ github.sha }}/`
3. Upload `dist/` to:
   - `s3://<bucket>/<base_path>/versions/<sha>/`
4. Set cache-control on upload:
   - `dist/assets/*` → `public, max-age=31536000, immutable`
   - `dist/images/*` → `public, max-age=<IMAGES_TTL_SECONDS>`
   - other `dist/*` → `no-cache`
5. Call reusable promote workflow with:
   - `sha: ${{ github.sha }}`

### Step 3: CI promote (reusable, strategy A: entry-only)

Create/refactor `.github/workflows/promote.yml`:

Non-negotiables:

- Do not run `aws s3 sync <versions/<sha>> <base_path> --delete` when `<base_path>` contains `versions/`.
- When calling a reusable workflow (`jobs.<job>.uses`), do not pass `${{ env.* }}` in `with:`.
  - Put those values into `workflow_call.inputs.default` instead; callers pass only `sha`.

Promote behavior:

1. Attempt to read `s3://.../<base_path>/current.json` to get the previous SHA.
2. Remove live copies of `/<base_path>/assets/` and `/<base_path>/images/` (recommended).
3. Copy only entry/root files from `versions/<sha>/` to `/<base_path>/`:
   - `index.html` (`no-cache`)
   - `mockServiceWorker.js` (`no-cache`)
   - optional `sso-test-callback.html` (`no-cache`)
4. Write `current.json` (`no-cache`).
5. Append a summary to `$GITHUB_STEP_SUMMARY`:
   - From SHA → To SHA

### Step 4: CI rollback

Create/refactor `.github/workflows/rollback.yml`:

1. Add `run-name: Rollback to ${{ inputs.sha }}`.
2. Add `workflow_dispatch` input `sha`.
3. Call the reusable promote workflow with:
   - `sha: ${{ inputs.sha }}`
4. Ensure `rollback.yml` exists on the **default branch**, otherwise GitHub UI will not show the workflow.

### Step 5: Verification

1. Build output:
   - `dist/index.html` references assets under `/<base_path>/versions/<sha>/assets/...`
2. After deploy/promote:
   - `/<base_path>/` loads
   - `/<base_path>/current.json` exists and matches the promoted SHA
   - `/<base_path>/versions/<sha>/assets/*` has long cache headers
   - `/<base_path>/assets/*` is absent/empty (strategy A)
3. Rollback:
   - manually run rollback with an older SHA
   - `current.json` updates to that SHA
   - GitHub Actions summary shows From SHA → To SHA

## Notes

- Keep `versions/<sha>/` indefinitely, or set an S3 lifecycle policy to expire old versions after N days.
- If using CloudFront, ensure cache policy respects `Cache-Control` from origin.
