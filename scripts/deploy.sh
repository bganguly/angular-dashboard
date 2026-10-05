#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA_DIR="$ROOT_DIR/infra"

_TARGET=""

# ── az CLI PATH fix ───────────────────────────────────────────────────────────

_az_fixup_path() {
  for _pybin in \
    /Library/Frameworks/Python.framework/Versions/3.14/bin \
    /Library/Frameworks/Python.framework/Versions/3.13/bin \
    /Library/Frameworks/Python.framework/Versions/3.12/bin \
    /Library/Frameworks/Python.framework/Versions/3.11/bin \
    "$HOME/.local/bin" \
    "$HOME/Library/Python/3.14/bin" \
    "$HOME/Library/Python/3.13/bin" \
    "$HOME/Library/Python/3.12/bin" \
    "$HOME/Library/Python/3.11/bin"; do
    if [[ -x "$_pybin/az" ]]; then
      export PATH="$_pybin:$PATH"
      return 0
    fi
  done
  return 1
}

# ── Menu ──────────────────────────────────────────────────────────────────────

_prompt_menu() {
  printf '\n=== angular-dashboard ===\n\n'
  printf '  [1] Local  — ng serve on localhost:4200 (no Azure cost)\n'
  printf '  [2] Azure  — Azure Static Web Apps (always-on CDN, free tier)\n'
  printf '\nChoice [1/2, default 2]: '
  read -r _MODE
  case "${_MODE:-2}" in
    1) _TARGET="local" ;;
    *) _TARGET="remote" ;;
  esac
}

# ── Local ─────────────────────────────────────────────────────────────────────

_deploy_local() {
  command -v node >/dev/null 2>&1 || { printf 'Node.js 20+ required.\n' >&2; exit 1; }

  printf '\nInstalling deps…\n'
  cd "$ROOT_DIR"
  npm install --prefer-offline 2>/dev/null || npm install

  BACKEND_URL="${BACKEND_URL:-http://localhost:8080}"
  printf '\nStarting ng serve on :4200 (proxying /api → %s)…\n' "$BACKEND_URL"
  printf 'Override: BACKEND_URL=https://your-backend ./scripts/deploy.sh\n\n'

  printf '{
  "/api": {
    "target": "%s",
    "secure": false,
    "changeOrigin": true
  }
}' "$BACKEND_URL" > "$ROOT_DIR/proxy.conf.json"

  npm start
}

# ── Azure: prerequisites ──────────────────────────────────────────────────────

_ensure_az() {
  if ! command -v az >/dev/null 2>&1; then
    _az_fixup_path
  fi

  if ! command -v az >/dev/null 2>&1; then
    printf '\naz CLI not found — installing…\n'
    if command -v pip3 >/dev/null 2>&1; then
      printf 'Trying pip3 install azure-cli (fastest)…\n'
      pip3 install --quiet azure-cli
      _az_fixup_path
    fi
    if ! command -v az >/dev/null 2>&1 && command -v brew >/dev/null 2>&1; then
      printf 'pip3 path failed — falling back to Homebrew (slow, compiles from source)…\n'
      brew install azure-cli
      _az_fixup_path
    fi
    if ! command -v az >/dev/null 2>&1; then
      printf 'Could not install az CLI. Run manually:\n  pip3 install azure-cli\nor: https://docs.microsoft.com/cli/azure/install-azure-cli\n' >&2
      exit 1
    fi
  fi

  if ! command -v terraform >/dev/null 2>&1; then
    printf '\nterraform not found — install from https://developer.hashicorp.com/terraform/install\n' >&2
    exit 1
  fi
}

_check_az_auth() {
  local ACTIVE_ACCOUNT
  ACTIVE_ACCOUNT=$(az account show --query user.name -o tsv 2>/dev/null || true)
  if [[ -z "$ACTIVE_ACCOUNT" ]]; then
    printf '\nNot authenticated — logging in…\n'
    az login
    ACTIVE_ACCOUNT=$(az account show --query user.name -o tsv)
  fi
  printf 'Azure account: %s\n' "$ACTIVE_ACCOUNT"
}

# ── Azure: deploy ─────────────────────────────────────────────────────────────

_deploy_azure() {
  printf '\n=== deployment config ===\n'
  AZ_LOCATION="${AZ_LOCATION:-eastus2}"
  NAME_PREFIX="${NAME_PREFIX:-ang-dash}"
  printf '  Location     : %s\n' "$AZ_LOCATION"
  printf '  Name prefix  : %s\n' "$NAME_PREFIX"

  printf '\n=== registering Azure resource providers (idempotent) ===\n'
  for _ns in Microsoft.Web; do
    _state=$(az provider show --namespace "$_ns" --query registrationState -o tsv 2>/dev/null || true)
    if [[ "$_state" != "Registered" ]]; then
      printf '  Registering %s…\n' "$_ns"
      az provider register --namespace "$_ns" --wait
    else
      printf '  %s already registered.\n' "$_ns"
    fi
  done

  printf '\n=== building Angular app ===\n'
  cd "$ROOT_DIR"
  npm ci --prefer-offline 2>/dev/null || npm ci
  npm run build:prod

  printf '\n=== provisioning Azure Static Web Apps via Terraform ===\n'
  cd "$INFRA_DIR"
  terraform init -input=false
  terraform apply -input=false -auto-approve \
    -var="name_prefix=${NAME_PREFIX}" \
    -var="location=${AZ_LOCATION}"

  local FRONTEND_URL DEPLOY_TOKEN
  FRONTEND_URL=$(terraform output -raw frontend_url)
  DEPLOY_TOKEN=$(terraform output -raw deploy_token)

  printf '\n=== deploying to Azure Static Web Apps ===\n'
  cd "$ROOT_DIR"
  npx --yes @azure/static-web-apps-cli@latest deploy dist/angular-dashboard/browser \
    --deployment-token "$DEPLOY_TOKEN" \
    --env production

  local ENV_FILE="$ROOT_DIR/.env.azure"
  printf 'FRONTEND_URL=%s\n' "$FRONTEND_URL" > "$ENV_FILE"
  printf '\nDone. Frontend URL:\n  %s\n' "$FRONTEND_URL"
}

# ── Main ──────────────────────────────────────────────────────────────────────

_prompt_menu
if [[ "$_TARGET" == "local" ]]; then
  _deploy_local
else
  _ensure_az
  _check_az_auth
  _deploy_azure
fi
