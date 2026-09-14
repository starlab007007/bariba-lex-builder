[CmdletBinding()]
param(
    [string]$JavaHome = $env:JAVA_HOME,
    [string]$AndroidSdk = $env:ANDROID_HOME,
    [switch]$SkipInstall
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
    if (-not $JavaHome -or -not (Test-Path -LiteralPath (Join-Path $JavaHome 'bin/java.exe'))) {
        throw 'Specify -JavaHome pointing to a JDK 21 installation.'
    }
    $version = & (Join-Path $JavaHome 'bin/java.exe') -version 2>&1 | Out-String
    if ($version -notmatch 'version "21\.') { throw 'This build requires JDK 21.' }
    if (-not $AndroidSdk -or -not (Test-Path -LiteralPath (Join-Path $AndroidSdk 'platforms/android-36'))) {
        throw 'Specify -AndroidSdk with Android API 36 installed.'
    }
    $env:JAVA_HOME = $JavaHome
    $env:ANDROID_HOME = $AndroidSdk
    if (-not $SkipInstall) {
        & npm.cmd install
        if ($LASTEXITCODE -ne 0) { throw 'npm install failed.' }
    }
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Web build failed.' }
    & node scripts/build-bariba-dictionary-asset.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Dictionary asset generation failed.' }
    & npx.cmd --no-install cap sync android
    if ($LASTEXITCODE -ne 0) { throw 'Capacitor sync failed.' }
    & .\android\gradlew.bat -p android :app:assembleDebug :app:assembleRelease :app:bundleRelease --max-workers=2
    if ($LASTEXITCODE -ne 0) { throw 'Android build failed.' }
    Write-Host 'Artifacts: android/app/build/outputs. Release signing uses existing android/app/signing.properties when available.'
} finally {
    Pop-Location
}

