#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/cixr0x/chirper.git}"
DEPLOY_DIR="${DEPLOY_DIR:-/var/lib/jenkins/chirper}"
GIT_BRANCH="${GIT_BRANCH:-main}"
TOKEN_FILE="${TOKEN_FILE:-/home/mcp13/git_token}"
NAMESPACE="${NAMESPACE:-chirper}"
SERVICES="${SERVICES:-}"
SKIP_MIGRATIONS="${SKIP_MIGRATIONS:-true}"
ALL_SERVICES=(identity profile media realtime posts graph timeline notifications bff web)

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Required command '$1' was not found. Run sudo bash scripts/k8s-vm-provision.sh on the VM." >&2
    exit 1
  }
}

trim_whitespace() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

strip_optional_quotes() {
  local value="$1"
  if [[ ${#value} -ge 2 ]]; then
    case "$value" in
      \"*\")
        value="${value:1:${#value}-2}"
        ;;
      \'*\')
        value="${value:1:${#value}-2}"
        ;;
    esac
  fi
  printf '%s' "$value"
}

read_database_url_from_file() {
  local file="$1"
  local line value

  [ -f "$file" ] || return 1

  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" =~ ^[[:space:]]*$ ]] && continue

    if [[ "$line" =~ ^[[:space:]]*(export[[:space:]]+)?DATABASE_URL[[:space:]]*= ]]; then
      value="${line#*=}"
      value="$(trim_whitespace "$value")"
      value="$(strip_optional_quotes "$value")"
      value="$(trim_whitespace "$value")"

      if [ -n "$value" ]; then
        printf '%s' "$value"
        return 0
      fi
    fi
  done < "$file"

  return 1
}

read_database_url() {
  local file
  for file in services/identity/.env.local services/identity/.env .env.local .env; do
    if database_url="$(read_database_url_from_file "$file")"; then
      printf '%s' "$database_url"
      return 0
    fi
  done

  echo "DATABASE_URL was not found in services/identity/.env.local, services/identity/.env, .env.local, or .env." >&2
  exit 1
}

selected_services() {
  if [ -z "${SERVICES// }" ]; then
    printf '%s\n' "${ALL_SERVICES[@]}"
    return
  fi
  tr ',' ' ' <<<"$SERVICES" | xargs -n1
}

is_known_service() {
  local service="$1"
  local known

  for known in "${ALL_SERVICES[@]}"; do
    if [ "$service" = "$known" ]; then
      return 0
    fi
  done

  return 1
}

is_full_deployment() {
  local service selected_service
  local selected_services_list=()

  while IFS= read -r selected_service; do
    [ -n "$selected_service" ] || continue
    selected_services_list+=("$selected_service")
  done < <(selected_services)

  [ "${#selected_services_list[@]}" -gt 0 ] || return 1

  for selected_service in "${selected_services_list[@]}"; do
    is_known_service "$selected_service" || return 1
  done

  for service in "${ALL_SERVICES[@]}"; do
    local found=false
    for selected_service in "${selected_services_list[@]}"; do
      if [ "$selected_service" = "$service" ]; then
        found=true
        break
      fi
    done
    [ "$found" = true ] || return 1
  done

  return 0
}

join_selected_services() {
  local first=true
  local service

  while IFS= read -r service; do
    [ -n "$service" ] || continue
    if [ "$first" = true ]; then
      first=false
    else
      printf ', '
    fi
    printf '%s' "$service"
  done
}

for cmd in git node npm docker helm kubectl; do
  require_cmd "$cmd"
done

if [ ! -s "$TOKEN_FILE" ]; then
  echo "GitHub token file is missing or empty: $TOKEN_FILE" >&2
  exit 1
fi

restore_xtrace=false
case "$-" in
  *x*)
    restore_xtrace=true
    set +x
    ;;
esac

TOKEN="$(tr -d '\r\n' < "$TOKEN_FILE")"
AUTH_URL="${REPO_URL/https:\/\//https:\/\/x-access-token:${TOKEN}@}"

if [ -d "$DEPLOY_DIR/.git" ]; then
  git -C "$DEPLOY_DIR" fetch --prune "$AUTH_URL" "$GIT_BRANCH"
  git -C "$DEPLOY_DIR" checkout -B "$GIT_BRANCH" FETCH_HEAD
else
  mkdir -p "$(dirname "$DEPLOY_DIR")"
  git clone --branch "$GIT_BRANCH" "$AUTH_URL" "$DEPLOY_DIR"
fi

if [ "$restore_xtrace" = true ]; then
  set -x
fi

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

restore_xtrace=false
case "$-" in
  *x*)
    restore_xtrace=true
    set +x
    ;;
esac

database_url="$(read_database_url)"

kubectl create secret generic chirper-database \
  --namespace "$NAMESPACE" \
  --from-literal "DATABASE_URL=$database_url" \
  --dry-run=client \
  -o yaml | kubectl apply -f -

if [ "$restore_xtrace" = true ]; then
  set -x
fi

if is_full_deployment; then
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

echo "Deployed services to namespace '$NAMESPACE': $(selected_services | join_selected_services)"
echo "Web: http://chirper.bobbycrimson.com"
echo "API: http://api.chirper.bobbycrimson.com"
