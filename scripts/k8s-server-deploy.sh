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
GIT_ASKPASS_FILE=""
SECRET_ENV_FILE=""

cleanup() {
  [ -n "$GIT_ASKPASS_FILE" ] && rm -f "$GIT_ASKPASS_FILE"
  [ -n "$SECRET_ENV_FILE" ] && rm -f "$SECRET_ENV_FILE"
  return 0
}

trap cleanup EXIT

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

write_git_askpass_helper() {
  GIT_ASKPASS_FILE="$(mktemp)"
  chmod 700 "$GIT_ASKPASS_FILE"
cat > "$GIT_ASKPASS_FILE" <<'ASKPASS'
#!/usr/bin/env bash
set -euo pipefail

prompt="${1:-}"
case "$prompt" in
  *Username*)
    printf '%s\n' "x-access-token"
    ;;
  *Password*)
    tr -d '\r\n' < "$TOKEN_FILE"
    ;;
  *)
    printf '\n'
    ;;
esac
ASKPASS
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

migration_script_for_service() {
  case "$1" in
    identity) echo "db:identity:migrate" ;;
    profile) echo "db:profile:migrate" ;;
    posts) echo "db:posts:migrate" ;;
    graph) echo "db:graph:migrate" ;;
    timeline) echo "db:timeline:migrate" ;;
    notifications) echo "db:notifications:migrate" ;;
    media) echo "db:media:migrate" ;;
    *) return 1 ;;
  esac
}

selected_migration_scripts() {
  local service script

  while IFS= read -r service; do
    [ -n "$service" ] || continue
    if script="$(migration_script_for_service "$service")"; then
      printf '%s\n' "$script"
    fi
  done < <(selected_services)
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

for cmd in git node npm docker helm kubectl sudo; do
  require_cmd "$cmd"
done

if [ ! -x /usr/local/bin/k3s ]; then
  echo "Required k3s binary was not found or is not executable: /usr/local/bin/k3s. Run sudo bash scripts/k8s-vm-provision.sh on the VM." >&2
  exit 1
fi

if ! sudo -n /usr/local/bin/k3s ctr --namespace k8s.io images list >/dev/null 2>&1; then
  echo "Current user cannot run k3s image commands with passwordless sudo. Run sudo bash scripts/k8s-vm-provision.sh on the VM." >&2
  exit 1
fi

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

write_git_askpass_helper

if [ -d "$DEPLOY_DIR/.git" ]; then
  GIT_ASKPASS="$GIT_ASKPASS_FILE" GIT_TERMINAL_PROMPT=0 TOKEN_FILE="$TOKEN_FILE" \
    git -C "$DEPLOY_DIR" remote set-url origin "$REPO_URL"
  GIT_ASKPASS="$GIT_ASKPASS_FILE" GIT_TERMINAL_PROMPT=0 TOKEN_FILE="$TOKEN_FILE" \
    git -C "$DEPLOY_DIR" fetch --prune origin "$GIT_BRANCH"
  GIT_ASKPASS="$GIT_ASKPASS_FILE" GIT_TERMINAL_PROMPT=0 TOKEN_FILE="$TOKEN_FILE" \
    git -C "$DEPLOY_DIR" checkout -B "$GIT_BRANCH" FETCH_HEAD
else
  mkdir -p "$(dirname "$DEPLOY_DIR")"
  GIT_ASKPASS="$GIT_ASKPASS_FILE" GIT_TERMINAL_PROMPT=0 TOKEN_FILE="$TOKEN_FILE" \
    git clone --branch "$GIT_BRANCH" "$REPO_URL" "$DEPLOY_DIR"
  GIT_ASKPASS="$GIT_ASKPASS_FILE" GIT_TERMINAL_PROMPT=0 TOKEN_FILE="$TOKEN_FILE" \
    git -C "$DEPLOY_DIR" remote set-url origin "$REPO_URL"
fi
rm -f "$GIT_ASKPASS_FILE"
GIT_ASKPASS_FILE=""

if [ "$restore_xtrace" = true ]; then
  set -x
fi

cd "$DEPLOY_DIR"

export SERVICES
bash scripts/k8s-server-build-images.sh

if [ "$SKIP_MIGRATIONS" != "true" ]; then
  migration_scripts=()
  while IFS= read -r script; do
    [ -n "$script" ] || continue
    migration_scripts+=("$script")
  done < <(selected_migration_scripts)

  if [ "${#migration_scripts[@]}" -gt 0 ]; then
    npm ci
    npm run prisma:generate
    for script in "${migration_scripts[@]}"; do
      npm run "$script"
    done
  fi
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
SECRET_ENV_FILE="$(mktemp)"
chmod 600 "$SECRET_ENV_FILE"
printf 'DATABASE_URL=%s\n' "$database_url" > "$SECRET_ENV_FILE"

kubectl create secret generic chirper-database \
  --namespace "$NAMESPACE" \
  --from-env-file="$SECRET_ENV_FILE" \
  --dry-run=client \
  -o yaml | kubectl apply -f -
rm -f "$SECRET_ENV_FILE"
SECRET_ENV_FILE=""

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
