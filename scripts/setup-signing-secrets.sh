#!/usr/bin/env bash
# Enregistre les 4 secrets de signature Android FITILA dans GitHub Actions.
# Les valeurs sont lues localement et transmises à `gh` sans jamais être affichées.
# Prérequis : GitHub CLI connecté (gh auth login) avec accès admin au dépôt.
# Usage (depuis la racine du dépôt) : bash scripts/setup-signing-secrets.sh
set -euo pipefail

REPO="${REPO:-starlab007007/bariba-lex-builder}"
PROPS="${PROPS:-bariba-lex-builder/android/app/signing.properties}"
[ -f "$PROPS" ] || PROPS="android/app/signing.properties"
KEYSTORE="${KEYSTORE:-.keystore/fitila-release.jks}"

[ -f "$PROPS" ] || { echo "Fichier introuvable : $PROPS" >&2; exit 1; }
[ -f "$KEYSTORE" ] || { echo "Clé introuvable : $KEYSTORE" >&2; exit 1; }
command -v gh >/dev/null || { echo "Installez GitHub CLI : https://cli.github.com" >&2; exit 1; }

prop() { grep -E "^$1=" "$PROPS" | head -1 | cut -d= -f2- | tr -d '\r'; }
STORE_PASSWORD="$(prop storePassword)"
KEY_ALIAS="$(prop keyAlias)"
KEY_PASSWORD="$(prop keyPassword)"
[ -n "$STORE_PASSWORD" ] && [ -n "$KEY_ALIAS" ] && [ -n "$KEY_PASSWORD" ] || {
  echo "signing.properties incomplet (storePassword, keyAlias, keyPassword)." >&2; exit 1; }

if command -v keytool >/dev/null; then
  keytool -list -keystore "$KEYSTORE" -storepass "$STORE_PASSWORD" -alias "$KEY_ALIAS" >/dev/null 2>&1 \
    || { echo "La clé ne s'ouvre pas avec ces identifiants." >&2; exit 1; }
  echo "✓ Clé vérifiée"
fi

base64 < "$KEYSTORE" | tr -d '\n' | gh secret set FITILA_KEYSTORE_BASE64 -R "$REPO"
printf '%s' "$STORE_PASSWORD" | gh secret set FITILA_KEYSTORE_PASSWORD -R "$REPO"
printf '%s' "$KEY_ALIAS" | gh secret set FITILA_KEY_ALIAS -R "$REPO"
printf '%s' "$KEY_PASSWORD" | gh secret set FITILA_KEY_PASSWORD -R "$REPO"

echo "✓ Secrets enregistrés :"
gh secret list -R "$REPO" | grep -E '^FITILA_KEY'
