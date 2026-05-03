# Smaller Service Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce Chirper Docker image sizes by separating build-time dependencies from runtime images.

**Architecture:** `Dockerfile.workspace` will keep a full monorepo build stage, then produce either a focused backend runtime image or a Next.js standalone web runtime image. Existing build scripts will choose `service-runtime` or `web-runtime` from each service's existing `StartKind` metadata.

**Tech Stack:** Docker multi-stage builds, npm workspaces, Next.js standalone output, k3s/containerd image import, PowerShell and Bash build scripts.

---

## File Structure

- Modify `Dockerfile.workspace`: add `build`, `service-runtime`, and `web-runtime` stages.
- Create `apps/web/next.config.mjs`: enable Next.js standalone output for the monorepo app.
- Modify `scripts/k8s-server-build-images.sh`: pass the Docker target and prune dangling Docker images after importing to k3s.
- Modify `scripts/k8s-build-images.ps1`: pass the Docker target for local builds.
- Add this design and plan under `docs/superpowers`.

## Tasks

- [ ] Update the Dockerfile to split build and runtime stages.
- [ ] Add Next.js standalone config for `apps/web`.
- [ ] Update local and server image build scripts to pass `--target`.
- [ ] Verify a backend focused npm install excludes Next.js.
- [ ] Build backend and web images on the VM.
- [ ] Deploy services with migrations skipped.
- [ ] Verify routes and image sizes.
