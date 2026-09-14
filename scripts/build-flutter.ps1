[CmdletBinding()]
param([string]$ProjectPath = (Join-Path (Split-Path -Parent $PSScriptRoot) 'fitila_flutter'))
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath (Join-Path $ProjectPath 'pubspec.yaml'))) { throw 'Flutter project not found.' }
Push-Location $ProjectPath
try {
    foreach ($arguments in @(@('pub','get'), @('analyze'), @('test'), @('build','apk','--release'), @('build','appbundle','--release'))) {
        & flutter @arguments
        if ($LASTEXITCODE -ne 0) { throw "Flutter command failed: $($arguments -join ' ')" }
    }
    Write-Host 'Artifacts: build/app/outputs. The inherited Flutter configuration uses a debug signing key; these builds are for acceptance testing.'
} finally {
    Pop-Location
}
