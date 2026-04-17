[CmdletBinding()]
param(
  [string]$ClusterName = "chirper-local"
)

$ErrorActionPreference = "Stop"

. "$PSScriptRoot\\k8s-common.ps1"

Update-ToolPath
Assert-Command docker
Assert-Command kind
Assert-Command kubectl
Assert-Command helm

$root = Get-ChirperRoot
$context = "kind-$ClusterName"
$clusterConfig = Join-Path $root "infra\\kind\\cluster.yaml"
$ingressValues = Join-Path $root "infra\\kind\\ingress-nginx-values.yaml"

if (-not (Test-KindCluster -ClusterName $ClusterName)) {
  Invoke-CheckedNative "kind" @("create", "cluster", "--name", $ClusterName, "--config", $clusterConfig)
}

Invoke-CheckedNative "kubectl" @("cluster-info", "--context", $context)

$null = helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx 2>$null
Invoke-CheckedNative "helm" @("repo", "update")

Invoke-CheckedNative "helm" @(
  "upgrade",
  "--install",
  "ingress-nginx",
  "ingress-nginx/ingress-nginx",
  "--namespace",
  "ingress-nginx",
  "--create-namespace",
  "--kube-context",
  $context,
  "--wait",
  "--timeout",
  "5m",
  "-f",
  $ingressValues
)

Invoke-CheckedNative "kubectl" @(
  "--context",
  $context,
  "wait",
  "--namespace",
  "ingress-nginx",
  "--for=condition=Ready",
  "pod",
  "-l",
  "app.kubernetes.io/component=controller",
  "--timeout=300s"
)

Write-Output "Local cluster is ready."
Write-Output "Web: http://chirper.localtest.me:8088"
Write-Output "API: http://api.chirper.localtest.me:8088"
