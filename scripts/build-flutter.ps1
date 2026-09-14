[CmdletBinding()]
param([string]$ProjectPath = (Join-Path (Split-Path -Parent $PSScriptRoot) 'fitila_flutter'))

$ErrorActionPreference = 'Stop'
$RootPath = Split-Path -Parent $PSScriptRoot
$EnvPath = Join-Path $RootPath '.env'
$DefinesPath = Join-Path $ProjectPath '.dart-defines.generated.json'

if (-not (Test-Path -LiteralPath (Join-Path $ProjectPath 'pubspec.yaml'))) {
    throw 'Flutter project not found.'
}

if (-not (Test-Path -LiteralPath $EnvPath)) {
    throw "FITILA server configuration file not found: $EnvPath"
}

$vars = @{}
Get-Content -LiteralPath $EnvPath | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
        $parts = $line.Split('=', 2)
        $name = $parts[0].Trim()
        $value = $parts[1].Trim().Trim('"').Trim("'")
        $vars[$name] = $value
    }
}

$supabaseUrl = $vars['SUPABASE_URL']
if ([string]::IsNullOrWhiteSpace($supabaseUrl)) {
    $supabaseUrl = $vars['VITE_SUPABASE_URL']
}

$supabaseKey = $vars['SUPABASE_ANON_KEY']
if ([string]::IsNullOrWhiteSpace($supabaseKey)) {
    $supabaseKey = $vars['SUPABASE_PUBLISHABLE_KEY']
}
if ([string]::IsNullOrWhiteSpace($supabaseKey)) {
    $supabaseKey = $vars['VITE_SUPABASE_PUBLISHABLE_KEY']
}

if ([string]::IsNullOrWhiteSpace($supabaseUrl) -or [string]::IsNullOrWhiteSpace($supabaseKey)) {
    throw 'FITILA Supabase URL/publishable key missing from .env.'
}

$config = @{
    SUPABASE_URL = $supabaseUrl
    SUPABASE_ANON_KEY = $supabaseKey
} | ConvertTo-Json

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($DefinesPath, $config, $utf8NoBom)

Write-Host 'FITILA server configuration prepared for Flutter build.'

Push-Location $ProjectPath
try {
    $commands = @(
        @('pub','get'),
        @('analyze'),
        @('test',"--dart-define-from-file=$DefinesPath"),
        @(
            'build','apk','--release',
            "--dart-define-from-file=$DefinesPath",
            '--obfuscate',
            '--split-debug-info=build\symbols'
        )
    )

    foreach ($arguments in $commands) {
        & flutter @arguments
        if ($LASTEXITCODE -ne 0) {
            throw "Flutter command failed: $($arguments -join ' ')"
        }
    }

    $apk = Join-Path $ProjectPath 'build\app\outputs\flutter-apk\app-release.apk'
    if (-not (Test-Path -LiteralPath $apk)) {
        throw "APK not generated: $apk"
    }

    Write-Host "APK generated: $apk"
    Get-FileHash -LiteralPath $apk -Algorithm SHA256 | Format-List
} finally {
    Pop-Location
    Remove-Item -LiteralPath $DefinesPath -Force -ErrorAction SilentlyContinue
}
