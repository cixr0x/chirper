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
            askpass_file="$(mktemp)"
            cleanup() {
              rm -rf "$tmpdir"
              rm -f "$askpass_file"
            }
            trap cleanup EXIT
            chmod 700 "$askpass_file"
            cat > "$askpass_file" <<'ASKPASS'
#!/usr/bin/env bash
set -euo pipefail

prompt="${1:-}"
case "$prompt" in
  *Username*)
    printf '%s\\n' "x-access-token"
    ;;
  *Password*)
    tr -d '\\r\\n' < "$TOKEN_FILE"
    ;;
  *)
    printf '\\n'
    ;;
esac
ASKPASS
            GIT_ASKPASS="$askpass_file" GIT_TERMINAL_PROMPT=0 TOKEN_FILE="$TOKEN_FILE" \\
              git clone --branch "$GIT_BRANCH" "$REPO_URL" "$tmpdir"
            "$tmpdir/scripts/k8s-server-deploy.sh"
          fi
        '''
      }
    }
  }
}
