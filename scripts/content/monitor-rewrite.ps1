param(
  [int] $InitialPid = 0
)

$ErrorActionPreference = "Stop"

$workspace = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$checkpointPath = Join-Path $workspace "content\work\rewrites.json"
$manifestPath = Join-Path $workspace "public\content\manifest.json"
$monitorLog = Join-Path $workspace "content\work\rewrite.monitor.log"
$stdoutPath = Join-Path $workspace "content\work\rewrite.auto.stdout.log"
$stderrPath = Join-Path $workspace "content\work\rewrite.auto.stderr.log"
$nodePath = (Get-Command node).Source
$currentPid = $InitialPid
$restartCount = 0

function Write-MonitorLog([string] $message) {
  $line = "$(Get-Date -Format o) $message"
  Add-Content -LiteralPath $monitorLog -Value $line
}

function Read-Progress {
  $checkpoint = Get-Content -LiteralPath $checkpointPath -Raw | ConvertFrom-Json
  $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  [pscustomobject]@{
    Items = @($checkpoint.items).Count
    Rejected = @($checkpoint.rejected).Count
    Total = [int]$manifest.totalQuestions
    UpdatedAt = $checkpoint.updatedAt
  }
}

if ($currentPid -gt 0) {
  Write-MonitorLog "started; watching PID $currentPid"
} else {
  Write-MonitorLog "started without an initial PID"
}

while ($true) {
  while (
    $currentPid -gt 0 -and
    (Get-Process -Id $currentPid -ErrorAction SilentlyContinue)
  ) {
    Start-Sleep -Seconds 60
  }

  $progress = Read-Progress
  Write-MonitorLog "PID $currentPid exited; items=$($progress.Items)/$($progress.Total), rejected=$($progress.Rejected), updatedAt=$($progress.UpdatedAt)"

  if ($progress.Items -ge $progress.Total -and $progress.Rejected -eq 0) {
    Write-MonitorLog "rewrite complete; running release checks"
    & pnpm content:rewrite:check *>> $monitorLog
    & pnpm content:build *>> $monitorLog
    & pnpm content:release-check *>> $monitorLog
    & pnpm check *>> $monitorLog
    Write-MonitorLog "post-build checks completed with exit code $LASTEXITCODE"
    break
  }

  if ($restartCount -ge 5) {
    Write-MonitorLog "stopping after five restarts with incomplete progress"
    exit 2
  }

  $restartCount += 1
  $process = Start-Process -FilePath $nodePath -ArgumentList @(
    "--env-file-if-exists=.env",
    "--env-file-if-exists=.env.local",
    "scripts/content/rewrite-with-model.mjs",
    "--batch-size=20",
    "--concurrency=16",
    "--request-timeout-ms=150000",
    "--single-pass"
  ) -WorkingDirectory $workspace -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath -WindowStyle Hidden -PassThru
  $currentPid = $process.Id
  Write-MonitorLog "restarted rewrite as PID $currentPid (restart $restartCount/5)"
}
