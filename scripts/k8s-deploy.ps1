[CmdletBinding()]
param(
  [string]$ClusterName = "chirper-local",
  [string]$Namespace = "chirper",
  [switch]$SkipImageBuild,
  [switch]$SkipMigrations,
  [switch]$SeedDemo
)

$ErrorActionPreference = "Stop"

. "$PSScriptRoot\\k8s-common.ps1"

Update-ToolPath
Assert-Command kubectl
Assert-Command helm
Assert-Command kind
Assert-Command npm

$root = Get-ChirperRoot
$context = "kind-$ClusterName"
$chartPath = Join-Path $root "infra\\helm\\chirper-service"
$kafkaManifest = Join-Path $root "infra\\k8s\\kafka.yaml"

if (-not (Test-KindCluster -ClusterName $ClusterName)) {
  throw "kind cluster '$ClusterName' does not exist. Run npm run k8s:bootstrap first."
}

if (-not $SkipImageBuild) {
  & "$PSScriptRoot\\k8s-build-images.ps1" -ClusterName $ClusterName
}

Push-Location $root
try {
  if (-not $SkipMigrations) {
    $migrationScripts = @(
      "db:identity:migrate",
      "db:profile:migrate",
      "db:posts:migrate",
      "db:graph:migrate",
      "db:timeline:migrate",
      "db:notifications:migrate",
      "db:media:migrate"
    )

    foreach ($script in $migrationScripts) {
      Invoke-CheckedNative "npm" @("run", $script)
    }
  }

  if ($SeedDemo) {
    Invoke-CheckedNative "npm" @("run", "db:seed:demo")
  }
} finally {
  Pop-Location
}

& cmd /c "kubectl --context $context get namespace $Namespace >nul 2>nul"
if ($LASTEXITCODE -ne 0) {
  Invoke-CheckedNative "kubectl" @("--context", $context, "create", "namespace", $Namespace)
}

$databaseUrl = Get-DatabaseUrl -Root $root
$secretEnvFile = Join-Path ([System.IO.Path]::GetTempPath()) ("chirper-db-" + [System.Guid]::NewGuid().ToString("N") + ".env")
$secretManifest = Join-Path ([System.IO.Path]::GetTempPath()) ("chirper-db-" + [System.Guid]::NewGuid().ToString("N") + ".yaml")
Set-Content -Path $secretEnvFile -Value "DATABASE_URL=$databaseUrl" -NoNewline

try {
  $secretYaml = Get-CheckedNativeOutput "kubectl" @(
    "--context",
    $context,
    "create",
    "secret",
    "generic",
    "chirper-database",
    "--namespace",
    $Namespace,
    "--from-env-file=$secretEnvFile",
    "--dry-run=client",
    "-o",
    "yaml"
  )
  Set-Content -Path $secretManifest -Value $secretYaml
  Invoke-CheckedNative "kubectl" @("--context", $context, "apply", "-f", $secretManifest)
} finally {
  Remove-Item -LiteralPath $secretEnvFile -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $secretManifest -Force -ErrorAction SilentlyContinue
}

Invoke-CheckedNative "kubectl" @("--context", $context, "--namespace", $Namespace, "apply", "-f", $kafkaManifest)
Invoke-CheckedNative "kubectl" @("--context", $context, "--namespace", $Namespace, "rollout", "status", "deployment/kafka", "--timeout=300s")
Invoke-CheckedNative "kubectl" @("--context", $context, "--namespace", $Namespace, "rollout", "status", "deployment/kafka-ui", "--timeout=300s")

$releases = @(
  "identity",
  "profile",
  "media",
  "realtime",
  "posts",
  "graph",
  "timeline",
  "notifications",
  "bff",
  "web"
)

foreach ($release in $releases) {
  $valuesFile = Join-Path $root "infra\\helm\\values\\local\\$release.yaml"
  Invoke-CheckedNative "helm" @(
    "upgrade",
    "--install",
    $release,
    $chartPath,
    "--namespace",
    $Namespace,
    "--create-namespace",
    "--kube-context",
    $context,
    "--wait",
    "--timeout",
    "5m",
    "-f",
    $valuesFile
  )
}

Write-Output "Chirper is deployed to namespace '$Namespace'."
Write-Output "Web: http://chirper.localtest.me:8088"
Write-Output "API: http://api.chirper.localtest.me:8088"
Write-Output "Kafka UI: kubectl --context $context -n $Namespace port-forward svc/kafka-ui 8081:8080"
