# Jenkins k3s Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a manually triggered Jenkins deployment path that pulls private GitHub source on the `training` VM, builds Chirper images on the VM, loads them into local k3s, and deploys them to `chirper.bobbycrimson.com` and `api.chirper.bobbycrimson.com`.

**Architecture:** VM provisioning is a separate operator-run step that installs Git, Node/npm, Helm, Docker, and Jenkins/k3s permissions. Jenkins only verifies prerequisites, updates the repo from GitHub using `/home/mcp13/git_token`, builds selected images, imports them into k3s, and runs Helm against server-specific values. The existing local `kind` deployment path remains unchanged.

**Tech Stack:** Debian 12, Jenkins, Git, Node.js 22/npm, Docker, k3s/containerd, kubectl, Helm, Bash, existing Helm chart in `infra/helm/chirper-service`.

---

## File Structure

- Create `scripts/k8s-vm-provision.sh`: one-time VM provisioning script run manually with `sudo`; installs and configures deployment tools and Jenkins permissions.
- Create `scripts/k8s-server-build-images.sh`: Linux image build/import script used by Jenkins; builds selected service images from `Dockerfile.workspace` and imports them into k3s.
- Create `scripts/k8s-server-deploy.sh`: Linux deployment script used by Jenkins; verifies tools, updates source from GitHub, optionally runs migrations, applies secrets/Kafka, runs Helm upgrades, and waits for rollouts.
- Create `Jenkinsfile`: manually triggered pipeline with `SERVICES`, `SKIP_MIGRATIONS`, and `GIT_BRANCH` parameters that invokes `scripts/k8s-server-deploy.sh`.
- Create `infra/helm/values/server/*.yaml`: server values copied from local values with public hostnames and HTTP URLs.
- Modify `package.json`: add server/provision scripts while preserving the existing `k8s:deploy` local behavior.

## Task 1: Add VM Provisioning Script

**Files:**
- Create: `scripts/k8s-vm-provision.sh`

- [ ] **Step 1: Create the provisioning script**

Create `scripts/k8s-vm-provision.sh` with this content:

```bash
#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script with sudo: sudo bash scripts/k8s-vm-provision.sh" >&2
  exit 1
fi

apt-get update
apt-get install -y --no-install-recommends ca-certificates curl gnupg git docker.io

if ! command -v node >/dev/null 2>&1 || ! node --version | grep -Eq '^v22\.'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

if ! command -v helm >/dev/null 2>&1; then
  curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
fi

systemctl enable --now docker

if id jenkins >/dev/null 2>&1; then
  usermod -aG docker jenkins
  install -d -o jenkins -g jenkins -m 700 /var/lib/jenkins/.kube
  cp /etc/rancher/k3s/k3s.yaml /var/lib/jenkins/.kube/config
  chown jenkins:jenkins /var/lib/jenkins/.kube/config
  chmod 600 /var/lib/jenkins/.kube/config
  cat >/etc/sudoers.d/chirper-jenkins <<'SUDOERS'
jenkins ALL=(root) NOPASSWD: /usr/local/bin/k3s ctr images import *
jenkins ALL=(root) NOPASSWD: /usr/local/bin/k3s kubectl *
SUDOERS
  chmod 440 /etc/sudoers.d/chirper-jenkins
  systemctl restart jenkins
fi

git --version
node --version
npm --version
docker --version
helm version --short
kubectl version --client=true
echo "VM provisioning complete."
```

- [ ] **Step 2: Validate shell syntax**

Run:

```powershell
bash -n scripts/k8s-vm-provision.sh
```

Expected: no output and exit code `0`.

- [ ] **Step 3: Commit**

Run:

```powershell
git add scripts/k8s-vm-provision.sh
git commit -m "chore: add vm deployment provisioning script"
```

## Task 2: Add Server Helm Values

**Files:**
- Create: `infra/helm/values/server/bff.yaml`
- Create: `infra/helm/values/server/web.yaml`
- Create: `infra/helm/values/server/identity.yaml`
- Create: `infra/helm/values/server/profile.yaml`
- Create: `infra/helm/values/server/media.yaml`
- Create: `infra/helm/values/server/realtime.yaml`
- Create: `infra/helm/values/server/posts.yaml`
- Create: `infra/helm/values/server/graph.yaml`
- Create: `infra/helm/values/server/timeline.yaml`
- Create: `infra/helm/values/server/notifications.yaml`

- [ ] **Step 1: Copy local values as the server baseline**

Run:

```powershell
New-Item -ItemType Directory -Force -Path infra/helm/values/server
Copy-Item infra/helm/values/local/*.yaml infra/helm/values/server/
```

- [ ] **Step 2: Update server web values**

Set `infra/helm/values/server/web.yaml` to use:

```yaml
env:
  - name: NODE_ENV
    value: production
  - name: PORT
    value: "3000"
  - name: BFF_INTERNAL_URL
    value: http://bff
  - name: NEXT_PUBLIC_BFF_URL
    value: http://api.chirper.bobbycrimson.com
  - name: SESSION_COOKIE_SECURE
    value: "false"

ingress:
  enabled: true
  className: traefik
  hosts:
    - host: chirper.bobbycrimson.com
      paths:
        - path: /
          pathType: Prefix
          servicePortName: http
```

Keep the existing `nameOverride`, `fullnameOverride`, `image`, `service`, and probe sections from `local/web.yaml`.

- [ ] **Step 3: Update server BFF values**

Set these fields in `infra/helm/values/server/bff.yaml`:

```yaml
env:
  - name: NODE_ENV
    value: production
  - name: PORT
    value: "4000"
  - name: IDENTITY_GRPC_URL
    value: identity:50051
  - name: PROFILE_GRPC_URL
    value: profile:50052
  - name: POSTS_GRPC_URL
    value: posts:50053
  - name: GRAPH_GRPC_URL
    value: graph:50054
  - name: TIMELINE_GRPC_URL
    value: timeline:50055
  - name: NOTIFICATIONS_GRPC_URL
    value: notifications:50056
  - name: REALTIME_GRPC_URL
    value: realtime:50057
  - name: MEDIA_GRPC_URL
    value: media:50058
  - name: BFF_PUBLIC_URL
    value: http://api.chirper.bobbycrimson.com

ingress:
  enabled: true
  className: traefik
  hosts:
    - host: api.chirper.bobbycrimson.com
      paths:
        - path: /
          pathType: Prefix
          servicePortName: http
```

Keep the existing `nameOverride`, `fullnameOverride`, `image`, and `service` sections from `local/bff.yaml`.

- [ ] **Step 4: Update server ingress class in all other server values that enable ingress**

Run:

```powershell
Select-String -Path infra/helm/values/server/*.yaml -Pattern 'className: nginx'
```

Replace `className: nginx` with `className: traefik` in server values only. Expected: no matches after replacement.

- [ ] **Step 5: Render web and BFF templates**

Run:

```powershell
helm template web infra/helm/chirper-service -f infra/helm/values/server/web.yaml
helm template bff infra/helm/chirper-service -f infra/helm/values/server/bff.yaml
```

Expected: rendered Ingress objects contain `chirper.bobbycrimson.com`, `api.chirper.bobbycrimson.com`, and `ingressClassName: traefik`.

- [ ] **Step 6: Commit**

Run:

```powershell
git add infra/helm/values/server
git commit -m "feat: add server helm values"
```

## Task 3: Add Server Image Build and Import Script

**Files:**
- Create: `scripts/k8s-server-build-images.sh`

- [ ] **Step 1: Create the image build script**

Create `scripts/k8s-server-build-images.sh` with this content:

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICES="${SERVICES:-$*}"

ALL_SERVICES=(identity profile posts graph timeline notifications media realtime bff web)

workspace_package() {
  case "$1" in
    identity) echo "@chirper/identity services/identity true service" ;;
    profile) echo "@chirper/profile services/profile true service" ;;
    posts) echo "@chirper/posts services/posts true service" ;;
    graph) echo "@chirper/graph services/graph true service" ;;
    timeline) echo "@chirper/timeline services/timeline true service" ;;
    notifications) echo "@chirper/notifications services/notifications true service" ;;
    media) echo "@chirper/media services/media true service" ;;
    realtime) echo "@chirper/realtime services/realtime false service" ;;
    bff) echo "@chirper/bff services/bff false service" ;;
    web) echo "@chirper/web apps/web false web" ;;
    *) echo "Unknown service: $1" >&2; exit 1 ;;
  esac
}

selected_services() {
  if [ -z "${SERVICES// }" ]; then
    printf '%s\n' "${ALL_SERVICES[@]}"
    return
  fi
  tr ',' ' ' <<<"$SERVICES" | xargs -n1
}

cd "$ROOT"
for service in $(selected_services); do
  read -r package dir enable_prisma start_kind <<<"$(workspace_package "$service")"
  tag="chirper/${service}:dev"
  echo "Building ${tag}"
  docker build \
    --file "$ROOT/Dockerfile.workspace" \
    --tag "$tag" \
    --build-arg "WORKSPACE_PACKAGE=$package" \
    --build-arg "WORKSPACE_DIR=$dir" \
    --build-arg "ENABLE_PRISMA=$enable_prisma" \
    --build-arg "START_KIND=$start_kind" \
    "$ROOT"
  echo "Importing ${tag} into k3s"
  docker save "$tag" | sudo /usr/local/bin/k3s ctr images import -
done
```

- [ ] **Step 2: Validate shell syntax**

Run:

```powershell
bash -n scripts/k8s-server-build-images.sh
```

Expected: no output and exit code `0`.

- [ ] **Step 3: Commit**

Run:

```powershell
git add scripts/k8s-server-build-images.sh
git commit -m "feat: add server image build script"
```

## Task 4: Add Server Deployment Script

**Files:**
- Create: `scripts/k8s-server-deploy.sh`

- [ ] **Step 1: Create the deployment script**

Create `scripts/k8s-server-deploy.sh` with this content:

```bash
#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/cixr0x/chirper.git}"
DEPLOY_DIR="${DEPLOY_DIR:-/var/lib/jenkins/chirper}"
GIT_BRANCH="${GIT_BRANCH:-main}"
TOKEN_FILE="${TOKEN_FILE:-/home/mcp13/git_token}"
NAMESPACE="${NAMESPACE:-chirper}"
SERVICES="${SERVICES:-}"
SKIP_MIGRATIONS="${SKIP_MIGRATIONS:-true}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Required command '$1' was not found. Run sudo bash scripts/k8s-vm-provision.sh on the VM." >&2
    exit 1
  }
}

for cmd in git node npm docker helm kubectl; do
  require_cmd "$cmd"
done

if [ ! -s "$TOKEN_FILE" ]; then
  echo "GitHub token file is missing or empty: $TOKEN_FILE" >&2
  exit 1
fi

TOKEN="$(tr -d '\r\n' < "$TOKEN_FILE")"
AUTH_URL="${REPO_URL/https:\/\//https:\/\/x-access-token:${TOKEN}@}"

set +x
if [ -d "$DEPLOY_DIR/.git" ]; then
  git -C "$DEPLOY_DIR" fetch --prune "$AUTH_URL" "$GIT_BRANCH"
  git -C "$DEPLOY_DIR" checkout -B "$GIT_BRANCH" FETCH_HEAD
else
  mkdir -p "$(dirname "$DEPLOY_DIR")"
  git clone --branch "$GIT_BRANCH" "$AUTH_URL" "$DEPLOY_DIR"
fi
set -x

cd "$DEPLOY_DIR"

export SERVICES
bash scripts/k8s-server-build-images.sh

if [ "$SKIP_MIGRATIONS" != "true" ]; then
  npm ci
  npm run prisma:generate
  npm run db:identity:migrate
  npm run db:profile:migrate
  npm run db:posts:migrate
  npm run db:graph:migrate
  npm run db:timeline:migrate
  npm run db:notifications:migrate
  npm run db:media:migrate
fi

kubectl get namespace "$NAMESPACE" >/dev/null 2>&1 || kubectl create namespace "$NAMESPACE"

if [ -f services/identity/.env.local ]; then
  database_url="$(grep -E '^DATABASE_URL=' services/identity/.env.local | sed 's/^DATABASE_URL=//' | sed 's/^["'\\'']//;s/["'\\'']$//')"
elif [ -f services/identity/.env ]; then
  database_url="$(grep -E '^DATABASE_URL=' services/identity/.env | sed 's/^DATABASE_URL=//' | sed 's/^["'\\'']//;s/["'\\'']$//')"
elif [ -f .env.local ]; then
  database_url="$(grep -E '^DATABASE_URL=' .env.local | sed 's/^DATABASE_URL=//' | sed 's/^["'\\'']//;s/["'\\'']$//')"
elif [ -f .env ]; then
  database_url="$(grep -E '^DATABASE_URL=' .env | sed 's/^DATABASE_URL=//' | sed 's/^["'\\'']//;s/["'\\'']$//')"
else
  echo "DATABASE_URL was not found in services/identity/.env(.local) or repo root env files." >&2
  exit 1
fi

kubectl create secret generic chirper-database \
  --namespace "$NAMESPACE" \
  --from-literal "DATABASE_URL=$database_url" \
  --dry-run=client \
  -o yaml | kubectl apply -f -

ALL_SERVICES=(identity profile media realtime posts graph timeline notifications bff web)
selected_services() {
  if [ -z "${SERVICES// }" ]; then
    printf '%s\n' "${ALL_SERVICES[@]}"
    return
  fi
  tr ',' ' ' <<<"$SERVICES" | xargs -n1
}

if [ -z "${SERVICES// }" ]; then
  kubectl --namespace "$NAMESPACE" apply -f infra/k8s/kafka.yaml
  kubectl --namespace "$NAMESPACE" rollout status deployment/kafka --timeout=300s
  kubectl --namespace "$NAMESPACE" rollout status deployment/kafka-ui --timeout=300s
fi

for service in $(selected_services); do
  helm upgrade --install "$service" infra/helm/chirper-service \
    --namespace "$NAMESPACE" \
    --create-namespace \
    --wait \
    --timeout 5m \
    -f "infra/helm/values/server/${service}.yaml"
  kubectl --namespace "$NAMESPACE" rollout restart "deployment/${service}"
  kubectl --namespace "$NAMESPACE" rollout status "deployment/${service}" --timeout=300s
done

echo "Deployed services to namespace '$NAMESPACE': $(selected_services | paste -sd ', ' -)"
echo "Web: http://chirper.bobbycrimson.com"
echo "API: http://api.chirper.bobbycrimson.com"
```

- [ ] **Step 2: Validate shell syntax**

Run:

```powershell
bash -n scripts/k8s-server-deploy.sh
```

Expected: no output and exit code `0`.

- [ ] **Step 3: Commit**

Run:

```powershell
git add scripts/k8s-server-deploy.sh
git commit -m "feat: add server deployment script"
```

## Task 5: Add Jenkins Pipeline

**Files:**
- Create: `Jenkinsfile`

- [ ] **Step 1: Create the Jenkinsfile**

Create `Jenkinsfile` with this content:

```groovy
pipeline {
  agent any

  parameters {
    string(name: 'SERVICES', defaultValue: '', description: 'Comma or space separated services. Empty deploys all services.')
    booleanParam(name: 'SKIP_MIGRATIONS', defaultValue: true, description: 'Skip database migrations during deployment.')
    string(name: 'GIT_BRANCH', defaultValue: 'main', description: 'Git branch to deploy.')
  }

  environment {
    DEPLOY_DIR = '/var/lib/jenkins/chirper'
    REPO_URL = 'https://github.com/cixr0x/chirper.git'
    TOKEN_FILE = '/home/mcp13/git_token'
    NAMESPACE = 'chirper'
  }

  stages {
    stage('Deploy') {
      steps {
        sh '''
          set -euo pipefail
          export SERVICES="${SERVICES}"
          export SKIP_MIGRATIONS="${SKIP_MIGRATIONS}"
          export GIT_BRANCH="${GIT_BRANCH}"
          export DEPLOY_DIR="${DEPLOY_DIR}"
          export REPO_URL="${REPO_URL}"
          export TOKEN_FILE="${TOKEN_FILE}"
          export NAMESPACE="${NAMESPACE}"

          if [ -x "$DEPLOY_DIR/scripts/k8s-server-deploy.sh" ]; then
            "$DEPLOY_DIR/scripts/k8s-server-deploy.sh"
          else
            tmpdir="$(mktemp -d)"
            trap 'rm -rf "$tmpdir"' EXIT
            token="$(tr -d '\\r\\n' < "$TOKEN_FILE")"
            git clone --branch "$GIT_BRANCH" "https://x-access-token:${token}@github.com/cixr0x/chirper.git" "$tmpdir"
            "$tmpdir/scripts/k8s-server-deploy.sh"
          fi
        '''
      }
    }
  }
}
```

- [ ] **Step 2: Validate Jenkinsfile is present in git**

Run:

```powershell
git diff -- Jenkinsfile
```

Expected: the pipeline contains `SERVICES`, `SKIP_MIGRATIONS`, and `GIT_BRANCH` parameters.

- [ ] **Step 3: Commit**

Run:

```powershell
git add Jenkinsfile
git commit -m "ci: add manual jenkins deployment pipeline"
```

## Task 6: Add Package Scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add scripts without changing existing local scripts**

Add these entries to the root `scripts` object:

```json
"k8s:vm:provision": "bash ./scripts/k8s-vm-provision.sh",
"k8s:server:build-images": "bash ./scripts/k8s-server-build-images.sh",
"k8s:server:deploy": "bash ./scripts/k8s-server-deploy.sh"
```

Keep the existing `k8s:deploy` value unchanged:

```json
"k8s:deploy": "powershell -ExecutionPolicy Bypass -File ./scripts/k8s-deploy.ps1"
```

- [ ] **Step 2: Validate JSON**

Run:

```powershell
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json ok')"
```

Expected:

```text
package.json ok
```

- [ ] **Step 3: Commit**

Run:

```powershell
git add package.json
git commit -m "chore: add server deployment npm scripts"
```

## Task 7: Provision VM and Configure Networking

**Files:**
- Use existing: `scripts/k8s-vm-provision.sh`

- [ ] **Step 1: Push implementation commits**

Run:

```powershell
git push origin main
```

Expected: push succeeds and GitHub contains the new scripts, Jenkinsfile, and server Helm values.

- [ ] **Step 2: Open HTTP firewall**

Run:

```powershell
gcloud.cmd compute firewall-rules create chirper-allow-http `
  --project crypto-matic `
  --network default `
  --allow tcp:80 `
  --source-ranges 0.0.0.0/0 `
  --description "Allow HTTP traffic to Chirper on k3s"
```

Expected: firewall rule is created, or command reports it already exists after a prior run.

- [ ] **Step 3: Copy or pull scripts on the VM**

Run:

```powershell
gcloud.cmd compute ssh training --project crypto-matic --zone us-central1-c --command "sudo mkdir -p /opt/chirper-bootstrap && sudo chown mcp13:mcp13 /opt/chirper-bootstrap"
gcloud.cmd compute scp scripts/k8s-vm-provision.sh training:/opt/chirper-bootstrap/k8s-vm-provision.sh --project crypto-matic --zone us-central1-c
```

Expected: script exists at `/opt/chirper-bootstrap/k8s-vm-provision.sh`.

- [ ] **Step 4: Run VM provisioning manually**

Run:

```powershell
gcloud.cmd compute ssh training --project crypto-matic --zone us-central1-c --command "sudo bash /opt/chirper-bootstrap/k8s-vm-provision.sh"
```

Expected: output ends with `VM provisioning complete.` and versions for Git, Node, npm, Docker, Helm, and kubectl.

- [ ] **Step 5: Verify DNS**

Run:

```powershell
Resolve-DnsName chirper.bobbycrimson.com -Type A
Resolve-DnsName api.chirper.bobbycrimson.com -Type A
```

Expected: both resolve to `34.171.220.142`.

## Task 8: Create and Run the Manual Jenkins Job

**Files:**
- Use existing: `Jenkinsfile`

- [ ] **Step 1: Open Jenkins access if needed**

If direct browser access to Jenkins is required, create a restricted firewall rule using the current public IP:

```powershell
$ip = (Invoke-RestMethod https://api.ipify.org)
gcloud.cmd compute firewall-rules create chirper-allow-jenkins `
  --project crypto-matic `
  --network default `
  --allow tcp:8080 `
  --source-ranges "$ip/32" `
  --description "Temporary restricted Jenkins access"
```

Expected: `http://34.171.220.142:8080` is reachable only from the current public IP.

- [ ] **Step 2: Configure Jenkins manual pipeline job**

In Jenkins UI, create a Pipeline job named `chirper-deploy` with a manual trigger only. Use the `Jenkinsfile` content from the pushed repo as the pipeline script, or configure Pipeline from SCM after adding GitHub credentials in Jenkins.

Expected: the job shows parameters `SERVICES`, `SKIP_MIGRATIONS`, and `GIT_BRANCH`.

- [ ] **Step 3: Run a web-only deployment first**

Start the job with:

```text
SERVICES=web
SKIP_MIGRATIONS=true
GIT_BRANCH=main
```

Expected: the job fails only if dependencies such as `bff` are not deployed yet; otherwise `deployment/web` rolls out.

- [ ] **Step 4: Run a full deployment**

Start the job with:

```text
SERVICES=
SKIP_MIGRATIONS=true
GIT_BRANCH=main
```

Expected: Kafka and all Chirper service deployments complete rollouts in namespace `chirper`.

## Task 9: Verify Runtime

**Files:**
- No code changes.

- [ ] **Step 1: Inspect k3s resources**

Run:

```powershell
gcloud.cmd compute ssh training --project crypto-matic --zone us-central1-c --command "kubectl -n chirper get pods,svc,ingress"
```

Expected: pods are `Running` or `Completed`, services exist for all deployed releases, and ingresses exist for web and bff.

- [ ] **Step 2: Verify HTTP routes**

Run:

```powershell
Invoke-WebRequest http://chirper.bobbycrimson.com -UseBasicParsing
Invoke-WebRequest http://api.chirper.bobbycrimson.com -UseBasicParsing
```

Expected: web returns an HTML response. API returns a reachable response from the BFF service, even if the path returns a controlled API error or 404.

- [ ] **Step 3: Capture final status**

Run:

```powershell
git status --short --branch
```

Expected: only unrelated pre-existing local changes remain.
