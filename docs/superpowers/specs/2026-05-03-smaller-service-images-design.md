# Smaller Service Images Design

## Goal

Reduce Chirper Kubernetes image size so backend services do not carry unrelated frontend and development dependencies.

## Current State

- `Dockerfile.workspace` installs the full monorepo dependency tree with root `npm ci`.
- Every service image keeps that full install in the final runtime image.
- Backend images include `next` and `@next/*`, even though only `apps/web` needs Next.js.
- On the VM, `chirper/posts:dev` measured about `1.3GB`, with `/app/node_modules` around `781MB`.
- A focused production install for `@chirper/posts` measured about `280MB` and did not include Next.js.

## Design

Keep one shared Dockerfile but split it into build and runtime targets:

- `build`: installs full monorepo dependencies and builds the selected workspace.
- `service-runtime`: installs production dependencies only for the selected backend workspace, copies built service/package artifacts and proto files, then runs `node dist/main.js`.
- `web-runtime`: uses Next.js standalone output so the web image contains only the traced runtime files and static assets needed by `apps/web`.

Both local and server image build scripts select the correct Docker target from the existing `StartKind` value. The server build script prunes dangling Docker images after import into k3s/containerd to prevent repeated deployments from filling `/var/lib/docker`.

## Verification

- Build at least one backend image and verify it no longer contains `node_modules/next`.
- Build the web image and verify the standalone server starts.
- Deploy the affected services with migrations skipped.
- Confirm public web and feed routes still work over HTTPS.
