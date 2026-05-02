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
jenkins ALL=(root) NOPASSWD: /usr/local/bin/k3s ctr --namespace k8s.io images list
jenkins ALL=(root) NOPASSWD: /usr/local/bin/k3s ctr --namespace k8s.io images import *
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
