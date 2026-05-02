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
SELECTED_SERVICES=($(selected_services))
for service in "${SELECTED_SERVICES[@]}"; do
  workspace_package "$service" >/dev/null
done

for service in "${SELECTED_SERVICES[@]}"; do
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
  docker save "$tag" | sudo -n /usr/local/bin/k3s ctr --namespace k8s.io images import -
done
