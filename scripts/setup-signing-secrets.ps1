# Enregistre les 4 secrets de signature Android FITILA dans GitHub Actions (Windows).
# Valeurs lues localement, jamais affichées. Prérequis : gh auth login.
# Usage (racine du dépôt) : powershell -ExecutionPolicy Bypass -File scripts\setup-signing-secrets.ps1
$ErrorActionPreference = 'Stop'
$Repo = if ($env:REPO) { $env:REPO } else { 'starlab007007/bariba-lex-builder' }
Set-Location (Split-Path -Parent $PSScriptRoot)
$Props = 'bariba-lex-builder/android/app/signing.properties'
if (-not (Test-Path $Props)) { $Props = 'android/app/signing.properties' }
$Keystore = '.keystore/fitila-release.jks'
if (-not (Test-Path $Props)) { throw "Fichier introuvable : $Props" }
if (-not (Test-Path $Keystore)) { throw "Clé introuvable : $Keystore" }

$values = @{}
Get-Content $Props | ForEach-Object {
  if ($_ -match '^\s*([^=#]+)=(.*)$') { $values[$Matches[1].Trim()] = $Matches[2].Trim() }
}
foreach ($k in 'storePassword', 'keyAlias', 'keyPassword') {
  if (-not $values[$k]) { throw "signing.properties incomplet : $k" }
}

# --body evite le retour a la ligne que Windows PowerShell ajoute dans un tube.
$keystoreB64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path $Keystore)))
gh secret set FITILA_KEYSTORE_BASE64 -R $Repo --body $keystoreB64
if ($LASTEXITCODE -ne 0) { throw 'Echec FITILA_KEYSTORE_BASE64' }
gh secret set FITILA_KEYSTORE_PASSWORD -R $Repo --body $values['storePassword']
if ($LASTEXITCODE -ne 0) { throw 'Echec FITILA_KEYSTORE_PASSWORD' }
gh secret set FITILA_KEY_ALIAS -R $Repo --body $values['keyAlias']
if ($LASTEXITCODE -ne 0) { throw 'Echec FITILA_KEY_ALIAS' }
gh secret set FITILA_KEY_PASSWORD -R $Repo --body $values['keyPassword']
if ($LASTEXITCODE -ne 0) { throw 'Echec FITILA_KEY_PASSWORD' }
Write-Host 'Secrets enregistrés :'
gh secret list -R $Repo | Select-String '^FITILA_KEY'
