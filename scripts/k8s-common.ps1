Set-StrictMode -Version Latest

function Update-ToolPath {
  $machinePath = [System.Environment]::GetEnvironmentVariable("PATH", "Machine")
  $userPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
  $env:PATH = "$machinePath;$userPath"
}

function Assert-Command {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' was not found in PATH."
  }
}

function Invoke-CheckedNative {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,

    [Parameter()]
    [string[]]$ArgumentList = @()
  )

  & $FilePath @ArgumentList
  if ($LASTEXITCODE -ne 0) {
    throw "Command '$FilePath $($ArgumentList -join ' ')' failed with exit code $LASTEXITCODE."
  }
}

function Get-CheckedNativeOutput {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,

    [Parameter()]
    [string[]]$ArgumentList = @()
  )

  $output = & $FilePath @ArgumentList
  if ($LASTEXITCODE -ne 0) {
    throw "Command '$FilePath $($ArgumentList -join ' ')' failed with exit code $LASTEXITCODE."
  }

  return @($output)
}

function Get-ChirperRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Get-DatabaseUrl {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Root
  )

  $candidates = @(
    (Join-Path $Root "services\\identity\\.env.local"),
    (Join-Path $Root "services\\identity\\.env"),
    (Join-Path $Root ".env.local"),
    (Join-Path $Root ".env")
  )

  foreach ($candidate in $candidates) {
    if (-not (Test-Path $candidate)) {
      continue
    }

    foreach ($line in Get-Content $candidate) {
      $trimmed = $line.Trim()
      if (-not $trimmed -or $trimmed.StartsWith("#") -or -not $trimmed.StartsWith("DATABASE_URL=")) {
        continue
      }

      $value = $trimmed.Substring("DATABASE_URL=".Length).Trim()
      if (
        ($value.StartsWith('"') -and $value.EndsWith('"')) -or
        ($value.StartsWith("'") -and $value.EndsWith("'"))
      ) {
        $value = $value.Substring(1, $value.Length - 2)
      }

      if ($value) {
        return $value
      }
    }
  }

  throw "DATABASE_URL was not found in services/identity/.env(.local) or the repo root env files."
}

function Test-KindCluster {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ClusterName
  )

  $clusters = @(& cmd /c "kind get clusters 2>nul")
  return $clusters -contains $ClusterName
}
