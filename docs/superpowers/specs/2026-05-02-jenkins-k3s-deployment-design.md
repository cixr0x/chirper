# Jenkins k3s Deployment Design

## Goal

Deploy Chirper to the Google Compute Engine VM named `training` in project `crypto-matic`, zone `us-central1-c`, using the existing k3s cluster on that VM.

Deployment is manually triggered from Jenkins. The VM is the build host and runtime host. Source code reaches the VM only through GitHub; container images are built on the VM and loaded into local k3s/containerd.

## Target Hosts

- Web: `chirper.bobbycrimson.com`
- API: `api.chirper.bobbycrimson.com`
- VM external IP: `34.171.220.142`

DNS must contain `A` records for both hostnames pointing to `34.171.220.142`. Initial deployment targets HTTP on port 80. HTTPS can be added after DNS and HTTP routing are confirmed.

## Current VM State

- Debian 12 VM is reachable through `gcloud compute ssh training --project crypto-matic --zone us-central1-c`.
- k3s is installed and active.
- `sudo kubectl get nodes` works and shows the single node as `Ready`.
- Jenkins is installed, enabled, active, and listening on port `8080`.
- The current SSH user can use passwordless `sudo`.
- The VM does not currently expose `git`, `node`, `npm`, `docker`, or `helm` on PATH.
- GitHub private repository access is available through `/home/mcp13/git_token`.

## Deployment Flow

1. A user manually starts the Jenkins deployment job.
2. Jenkins checks out or updates `https://github.com/cixr0x/chirper.git` on the VM using `/home/mcp13/git_token`.
3. Jenkins verifies required VM tools are present: Git, Node/npm, Helm, and a container image build path compatible with k3s.
4. Jenkins builds selected Chirper service images on the VM from `Dockerfile.workspace`.
5. Jenkins imports the images into k3s/containerd with tags matching the Helm values.
6. Jenkins applies or updates Kubernetes resources with Helm against the local k3s cluster.
7. Jenkins waits for rollout status for the selected services and reports the web/API URLs.

## Repository Changes

The existing local `kind` deployment path should remain intact.

Add a server deployment path that supports the Jenkins workflow without requiring Artifact Registry:

- Server-specific Helm values for public hosts and production-like environment values.
- A VM/Jenkins deployment script or Jenkinsfile that performs pull, build, k3s image import, and Helm upgrade.
- A separate VM provisioning step or script for installing Git, Node/npm, Helm, and the selected container build tooling. Jenkins may verify these tools before deployment, but Jenkins is not responsible for maintaining them.
- Script parameters for selected services and migration skipping so it remains compatible with the local convention:
  `npm run k8s:deploy -- -Services <services> -SkipMigrations`

The implementation may either extend the existing PowerShell scripts with an explicit server target or add a separate Jenkins/server script that reuses the same service list and Helm chart.

## Networking

Open GCP firewall ingress for:

- TCP 80 for HTTP app/API traffic.
- TCP 443 later when TLS is configured.
- TCP 8080 only if Jenkins needs direct browser access from outside the VM. Prefer restricting this to trusted source IPs if opened.

k3s should provide ingress routing for `chirper.bobbycrimson.com` and `api.chirper.bobbycrimson.com`.

## Manual Trigger Scope

Jenkins should start with a manually triggered job. GitHub webhooks are intentionally out of scope for the first deployment.

The job should accept a service selection parameter so redeploying only `web`, only `bff`, or all services is possible.

## Error Handling

The deployment job should fail fast if:

- `/home/mcp13/git_token` is missing or empty.
- Required tools are missing from the VM.
- Git checkout or pull fails.
- Image build fails for any selected service.
- Image import into k3s fails.
- Helm upgrade fails.
- Kubernetes rollout does not complete before timeout.

Logs must avoid printing the GitHub token.

## Verification

After implementation, verify:

- DNS resolves both hostnames to `34.171.220.142`.
- GCP firewall permits inbound HTTP.
- Jenkins manual job can pull the private repo.
- k3s can run at least the selected service images built on the VM.
- Helm rollout completes for deployed services.
- `http://chirper.bobbycrimson.com` and `http://api.chirper.bobbycrimson.com` reach the expected routes once DNS has propagated.

## Deferred Work

- HTTPS/TLS setup.
- GitHub webhook-triggered deployments.
- Registry-backed deployments through Artifact Registry.
- Jenkins access hardening beyond the initial firewall decision.
