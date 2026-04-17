[CmdletBinding()]
param(
  [string]$ClusterName = "chirper-local"
)

$ErrorActionPreference = "Stop"

. "$PSScriptRoot\\k8s-common.ps1"

Update-ToolPath
Assert-Command docker
Assert-Command kind

$root = Get-ChirperRoot
$dockerfile = Join-Path $root "Dockerfile.workspace"
$clusterExists = Test-KindCluster -ClusterName $ClusterName

$workspaces = @(
  @{ Name = "identity"; Package = "@chirper/identity"; Directory = "services/identity"; EnablePrisma = "true"; StartKind = "service" },
  @{ Name = "profile"; Package = "@chirper/profile"; Directory = "services/profile"; EnablePrisma = "true"; StartKind = "service" },
  @{ Name = "posts"; Package = "@chirper/posts"; Directory = "services/posts"; EnablePrisma = "true"; StartKind = "service" },
  @{ Name = "graph"; Package = "@chirper/graph"; Directory = "services/graph"; EnablePrisma = "true"; StartKind = "service" },
  @{ Name = "timeline"; Package = "@chirper/timeline"; Directory = "services/timeline"; EnablePrisma = "true"; StartKind = "service" },
  @{ Name = "notifications"; Package = "@chirper/notifications"; Directory = "services/notifications"; EnablePrisma = "true"; StartKind = "service" },
  @{ Name = "media"; Package = "@chirper/media"; Directory = "services/media"; EnablePrisma = "true"; StartKind = "service" },
  @{ Name = "realtime"; Package = "@chirper/realtime"; Directory = "services/realtime"; EnablePrisma = "false"; StartKind = "service" },
  @{ Name = "bff"; Package = "@chirper/bff"; Directory = "services/bff"; EnablePrisma = "false"; StartKind = "service" },
  @{ Name = "web"; Package = "@chirper/web"; Directory = "apps/web"; EnablePrisma = "false"; StartKind = "web" }
)

foreach ($workspace in $workspaces) {
  $tag = "chirper/$($workspace.Name):dev"
  Write-Output "Building $tag"

  Invoke-CheckedNative "docker" @(
    "build",
    "--file",
    $dockerfile,
    "--tag",
    $tag,
    "--build-arg",
    "WORKSPACE_PACKAGE=$($workspace.Package)",
    "--build-arg",
    "WORKSPACE_DIR=$($workspace.Directory)",
    "--build-arg",
    "ENABLE_PRISMA=$($workspace.EnablePrisma)",
    "--build-arg",
    "START_KIND=$($workspace.StartKind)",
    $root
  )

  if ($clusterExists) {
    Invoke-CheckedNative "kind" @("load", "docker-image", $tag, "--name", $ClusterName)
  }
}

if ($clusterExists) {
  Write-Output "Images loaded into kind cluster '$ClusterName'."
} else {
  Write-Output "Images built locally. Cluster '$ClusterName' was not found, so no images were loaded."
}
