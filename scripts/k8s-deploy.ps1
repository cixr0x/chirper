[CmdletBinding()]
param(
  [string]$ClusterName = "chirper-local",
  [string]$Namespace = "chirper",
  [string[]]$Services = @(),
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
$allReleases = @(
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
$selectedReleases = @(Resolve-SelectedItems -Requested $Services -Available $allReleases -Label "services")
$migrationScriptsByRelease = @{
  identity = "db:identity:migrate"
  profile = "db:profile:migrate"
  posts = "db:posts:migrate"
  graph = "db:graph:migrate"
  timeline = "db:timeline:migrate"
  notifications = "db:notifications:migrate"
  media = "db:media:migrate"
}
$seedScriptsByRelease = @{
  identity = "db:identity:seed:demo"
  profile = "db:profile:seed:demo"
  posts = "db:posts:seed:demo"
  graph = "db:graph:seed:demo"
  timeline = "db:timeline:seed:demo"
  notifications = "db:notifications:seed:demo"
  media = "db:media:seed:demo"
}

if (-not (Test-KindCluster -ClusterName $ClusterName)) {
  throw "kind cluster '$ClusterName' does not exist. Run npm run k8s:bootstrap first."
}

if (-not $SkipImageBuild) {
  & "$PSScriptRoot\\k8s-build-images.ps1" -ClusterName $ClusterName -Services $selectedReleases
}

Push-Location $root
try {
  if (-not $SkipMigrations) {
    $migrationScripts = @(
      $selectedReleases |
        Where-Object { $migrationScriptsByRelease.ContainsKey($_) } |
        ForEach-Object { $migrationScriptsByRelease[$_] }
    )

    foreach ($script in $migrationScripts) {
      Invoke-CheckedNative "npm" @("run", $script)
    }
  }

  if ($SeedDemo) {
    $seedScripts = @(
      $selectedReleases |
        Where-Object { $seedScriptsByRelease.ContainsKey($_) } |
        ForEach-Object { $seedScriptsByRelease[$_] }
    )

    foreach ($script in $seedScripts) {
      Invoke-CheckedNative "npm" @("run", $script)
    }
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

if ($selectedReleases.Count -eq $allReleases.Count) {
  Invoke-CheckedNative "kubectl" @("--context", $context, "--namespace", $Namespace, "apply", "-f", $kafkaManifest)
  Invoke-CheckedNative "kubectl" @("--context", $context, "--namespace", $Namespace, "rollout", "status", "deployment/kafka", "--timeout=300s")
  Invoke-CheckedNative "kubectl" @("--context", $context, "--namespace", $Namespace, "rollout", "status", "deployment/kafka-ui", "--timeout=300s")
}

foreach ($release in $selectedReleases) {
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

  Invoke-CheckedNative "kubectl" @("--context", $context, "--namespace", $Namespace, "rollout", "restart", "deployment/$release")
  Invoke-CheckedNative "kubectl" @("--context", $context, "--namespace", $Namespace, "rollout", "status", "deployment/$release", "--timeout=300s")
}

Write-Output "Deployed releases to namespace '$Namespace': $($selectedReleases -join ', ')."
Write-Output "Web: http://chirper.localtest.me:8088"
Write-Output "API: http://api.chirper.localtest.me:8088"
Write-Output "Kafka UI: kubectl --context $context -n $Namespace port-forward svc/kafka-ui 8081:8080"
