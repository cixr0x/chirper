# Traefik HTTPS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable trusted HTTPS for Chirper on the Google Cloud VM through shared k3s Traefik ACME configuration.

**Architecture:** k3s Traefik remains the single shared edge for the VM. A `HelmChartConfig` enables Let's Encrypt, ACME persistence, and HTTP-to-HTTPS redirects, while Chirper's public ingresses request Traefik's certificate resolver through annotations.

**Tech Stack:** k3s, Traefik 3.6, k3s Helm controller, Kubernetes Ingress, Helm, Bash, Next.js environment values.

---

## File Structure

- Create `infra/k8s/server/traefik-https.yaml`: shared VM Traefik HTTPS configuration.
- Modify `scripts/k8s-server-deploy.sh`: apply the Traefik HTTPS manifest before app Helm upgrades and print HTTPS URLs.
- Modify `infra/helm/values/server/web.yaml`: use HTTPS public API URL, secure cookies, and Traefik TLS annotations.
- Modify `infra/helm/values/server/bff.yaml`: use HTTPS public API URL and Traefik TLS annotations.
- Add this plan and the matching design spec under `docs/superpowers`.

### Task 1: Add Shared Traefik HTTPS Config

**Files:**
- Create: `infra/k8s/server/traefik-https.yaml`

- [ ] **Step 1: Create the manifest**

Create `infra/k8s/server/traefik-https.yaml` with a `helm.cattle.io/v1` `HelmChartConfig` named `traefik` in `kube-system`. Its `valuesContent` must enable persistence at `/data`, add HTTP-to-HTTPS redirect arguments to explicit port `:443`, and configure the `letsencrypt` ACME TLS-ALPN resolver with `robertorojas87@gmail.com`.

- [ ] **Step 2: Verify YAML text**

Run:

```powershell
Get-Content infra/k8s/server/traefik-https.yaml
```

Expected: the file contains `kind: HelmChartConfig`, `certificatesresolvers.letsencrypt`, and `/data/acme.json`.

### Task 2: Update Server Ingress Values

**Files:**
- Modify: `infra/helm/values/server/web.yaml`
- Modify: `infra/helm/values/server/bff.yaml`

- [ ] **Step 1: Update web values**

Set `NEXT_PUBLIC_BFF_URL` to `https://api.chirper.bobbycrimson.com`, set `SESSION_COOKIE_SECURE` to `"true"`, and add Traefik annotations for `websecure`, TLS, and the `letsencrypt` cert resolver.

- [ ] **Step 2: Update BFF values**

Set `BFF_PUBLIC_URL` to `https://api.chirper.bobbycrimson.com` and add the same Traefik TLS annotations.

- [ ] **Step 3: Render Helm templates**

Run:

```powershell
helm template web infra/helm/chirper-service -f infra/helm/values/server/web.yaml
helm template bff infra/helm/chirper-service -f infra/helm/values/server/bff.yaml
```

Expected: both rendered ingresses include `traefik.ingress.kubernetes.io/router.tls.certresolver: letsencrypt`.

### Task 3: Apply Traefik Config During Server Deploy

**Files:**
- Modify: `scripts/k8s-server-deploy.sh`

- [ ] **Step 1: Apply the shared manifest**

After namespace creation and before Kafka/service Helm upgrades, apply `infra/k8s/server/traefik-https.yaml` if it exists. Wait for `deployment/traefik` in `kube-system` to roll out.

- [ ] **Step 2: Update deployment output**

Change the final web/API log lines to `https://chirper.bobbycrimson.com` and `https://api.chirper.bobbycrimson.com`.

- [ ] **Step 3: Validate shell syntax**

Run:

```powershell
bash -n scripts/k8s-server-deploy.sh
```

Expected: no output and exit code `0`.

### Task 4: Verify, Commit, Push, and Deploy

**Files:**
- No additional source files.

- [ ] **Step 1: Check repository diff**

Run:

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors; only HTTPS-related files are modified.

- [ ] **Step 2: Commit and push**

Run:

```powershell
git add docs/superpowers/specs/2026-05-03-traefik-https-design.md docs/superpowers/plans/2026-05-03-traefik-https.md infra/k8s/server/traefik-https.yaml infra/helm/values/server/web.yaml infra/helm/values/server/bff.yaml scripts/k8s-server-deploy.sh
git commit -m "feat: enable vm https ingress"
git push origin main
```

- [ ] **Step 3: Deploy affected public services**

Run:

```powershell
npm run k8s:deploy -- -Services web,bff -SkipMigrations
```

Expected: the deploy completes rollouts for `web` and `bff`.

- [ ] **Step 4: Verify live HTTPS**

Run:

```powershell
Invoke-WebRequest https://chirper.bobbycrimson.com -UseBasicParsing
Invoke-WebRequest https://api.chirper.bobbycrimson.com -UseBasicParsing
Invoke-WebRequest http://chirper.bobbycrimson.com -MaximumRedirection 0 -UseBasicParsing
Invoke-WebRequest http://api.chirper.bobbycrimson.com -MaximumRedirection 0 -UseBasicParsing
```

Expected: HTTPS web returns `200`; HTTPS API reaches BFF and may return `404`; HTTP requests return redirects to HTTPS.
