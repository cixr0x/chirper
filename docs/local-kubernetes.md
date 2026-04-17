# Local Kubernetes

This repo now includes a local Kubernetes deployment path built around:

- `kind` for the cluster
- `helm` for service deployments
- local Docker images loaded directly into the cluster
- the existing remote MySQL database for persistent state
- an in-cluster Kafka deployment for the event pipeline

## Prerequisites

- Docker Desktop running in Linux container mode
- `kubectl`
- `kind`
- `helm`

## Bootstrap

Create the `kind` cluster and install `ingress-nginx`:

```powershell
npm run k8s:bootstrap
```

The bootstrap config maps host port `8088` to the ingress controller, so you can use:

- `http://chirper.localtest.me:8088`
- `http://api.chirper.localtest.me:8088`

`localtest.me` resolves to `127.0.0.1`, so no hosts-file edits are required.

## Build Images

Build all service images and load them into the cluster:

```powershell
npm run k8s:build-images
```

Images are tagged as:

- `chirper/web:dev`
- `chirper/bff:dev`
- `chirper/identity:dev`
- `chirper/profile:dev`
- `chirper/posts:dev`
- `chirper/graph:dev`
- `chirper/timeline:dev`
- `chirper/notifications:dev`
- `chirper/media:dev`
- `chirper/realtime:dev`

## Deploy

Deploy the stack:

```powershell
npm run k8s:deploy
```

Deploy and seed demo data:

```powershell
npm run k8s:deploy -- -SeedDemo
```

What the deploy script does:

1. Builds and loads images unless `-SkipImageBuild` is passed.
2. Runs the existing Flyway migrations from the host unless `-SkipMigrations` is passed.
3. Creates the `chirper-database` Kubernetes secret from `services/identity/.env` or `.env.local`.
4. Applies the in-cluster Kafka and Kafka UI manifests.
5. Installs each service with Helm values from `infra/helm/values/local`.

## Cluster Layout

- `web` and `bff` are reachable through ingress.
- Internal services expose both HTTP and gRPC ports through ClusterIP services.
- Kafka runs inside the `chirper` namespace.
- MySQL stays external.

## Kafka UI

Kafka UI is deployed as an internal ClusterIP service. To inspect topics:

```powershell
kubectl --context kind-chirper-local -n chirper port-forward svc/kafka-ui 8081:8080
```

Then open `http://127.0.0.1:8081`.

## Notes

- The web app uses `BFF_INTERNAL_URL=http://bff` inside the cluster for server-side calls.
- The BFF publishes media redirect URLs with `BFF_PUBLIC_URL=http://api.chirper.localtest.me:8088`.
- The current deployment path runs migrations from the host, not as in-cluster Jobs.

## Troubleshooting

If `npm run k8s:bootstrap` fails while `kind` is starting the control-plane kubelet, the usual cause is the local Docker Desktop environment rather than the repo:

- confirm Docker Desktop is using Linux containers
- confirm the WSL2 backend is enabled
- restart Docker Desktop and retry the bootstrap command
