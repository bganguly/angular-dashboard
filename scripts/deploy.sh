#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA_DIR="$ROOT_DIR/infra"

printf '\n=== angular-dashboard ===\n\n'
printf '  [1] Local  — ng serve on localhost:4200 (no Azure cost)\n'
printf '  [2] Azure  — Azure Container Apps (scales to zero)\n'
printf '\nChoice [1/2, default 2]: '
read -r _MODE
case "${_MODE:-2}" in
  1) _TARGET="local" ;;
  *) _TARGET="remote" ;;
esac

# ──────────────────────────────────────────────────────────────────────────────
# LOCAL
# ──────────────────────────────────────────────────────────────────────────────
if [[ "$_TARGET" == "local" ]]; then
  command -v node >/dev/null 2>&1 || { printf 'Node.js 20+ required.\n' >&2; exit 1; }

  printf '\nInstalling deps…\n'
  cd "$ROOT_DIR"
  npm install --prefer-offline 2>/dev/null || npm install

  BACKEND_URL="${BACKEND_URL:-http://localhost:8080}"
  printf '\nStarting ng serve on :4200 (proxying /api → %s)…\n' "$BACKEND_URL"
  printf 'Override: BACKEND_URL=https://your-backend ./scripts/deploy.sh\n\n'

  echo "{
  \"/api\": {
    \"target\": \"$BACKEND_URL\",
    \"secure\": false,
    \"changeOrigin\": true
  }
}" > "$ROOT_DIR/proxy.conf.json"

  npm start
  exit 0
fi

# ──────────────────────────────────────────────────────────────────────────────
# AZURE
# ──────────────────────────────────────────────────────────────────────────────
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

ACTIVE_ACCOUNT=$(az account show --query user.name -o tsv 2>/dev/null || true)
if [[ -z "$ACTIVE_ACCOUNT" ]]; then
  printf '\nNot authenticated — logging in…\n'
  az login
  ACTIVE_ACCOUNT=$(az account show --query user.name -o tsv)
fi
printf 'Azure account: %s\n' "$ACTIVE_ACCOUNT"

if ! command -v terraform >/dev/null 2>&1; then
  printf '\nterraform not found — install from https://developer.hashicorp.com/terraform/install\n' >&2
  exit 1
fi

printf '\n=== deployment config ===\n'
AZ_SUBSCRIPTION=$(az account show --query id -o tsv)
AZ_LOCATION="${AZ_LOCATION:-eastus}"
NAME_PREFIX="${NAME_PREFIX:-ang-dash}"
printf '  Subscription : %s\n' "$AZ_SUBSCRIPTION"
printf '  Location     : %s\n' "$AZ_LOCATION"
printf '  Name prefix  : %s\n' "$NAME_PREFIX"

BACKEND_ENV="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../java-implementations/springboot-dashboard-backend" 2>/dev/null && pwd)/.env.gcp.full"

if [[ -z "${BACKEND_URL:-}" && -f "$BACKEND_ENV" ]]; then
  BACKEND_URL=$(grep -i 'CLOUD_RUN_URL=' "$BACKEND_ENV" | head -1 | cut -d= -f2-)
  printf '  Backend URL  : %s (from springboot-dashboard-backend/.env.gcp.full)\n' "$BACKEND_URL"
fi

if [[ -z "${BACKEND_URL:-}" ]]; then
  printf '\nCould not auto-detect backend URL.\nRun the springboot-dashboard-backend deploy first, or set BACKEND_URL manually:\n'
  printf '  BACKEND_URL=https://your-backend ./scripts/deploy.sh\n' >&2
  exit 1
fi

cd "$INFRA_DIR"
terraform init -input=false

ACR_NAME=$(terraform output -raw acr_login_server 2>/dev/null || true)

if [[ -z "$ACR_NAME" ]]; then
  printf '\n=== provisioning ACR (first deploy only) ===\n'
  terraform apply -input=false -auto-approve \
    -var="name_prefix=${NAME_PREFIX}" \
    -var="location=${AZ_LOCATION}" \
    -var="backend_url=${BACKEND_URL}" \
    -var="frontend_image=mcr.microsoft.com/azuredocs/aci-helloworld:latest"
  ACR_NAME=$(terraform output -raw acr_login_server)
fi

_shasum() { shasum -a 256 "$@" 2>/dev/null || sha256sum "$@" 2>/dev/null; }
TAG=$(find "$ROOT_DIR/src" "$ROOT_DIR/Dockerfile" "$ROOT_DIR/package.json" \
    -type f 2>/dev/null | sort | xargs cat 2>/dev/null | _shasum | cut -c1-16 || true)
TAG="${TAG:-$(date +%Y%m%d%H%M%S)}"

REPO="${NAME_PREFIX}-frontend"
IMAGE="${ACR_NAME}/${REPO}:${TAG}"

_IMG_EXISTS=$(az acr repository show-tags --name "${ACR_NAME%%.*}" \
  --repository "$REPO" --query "[?@=='${TAG}']" -o tsv 2>/dev/null || true)

if [[ -n "$_IMG_EXISTS" ]]; then
  printf '\n  Image %s already exists — skipping build.\n' "$TAG"
else
  printf '\n=== building image via ACR Tasks ===\n'
  printf '  Image: %s\n' "$IMAGE"
  az acr build \
    --registry "${ACR_NAME%%.*}" \
    --image "${REPO}:${TAG}" \
    --image "${REPO}:latest" \
    "$ROOT_DIR"
fi

printf '\n=== deploying via Terraform ===\n'
terraform apply -input=false -auto-approve \
  -var="name_prefix=${NAME_PREFIX}" \
  -var="location=${AZ_LOCATION}" \
  -var="backend_url=${BACKEND_URL}" \
  -var="frontend_image=${IMAGE}"

FRONTEND_URL=$(terraform output -raw frontend_url 2>/dev/null || true)
ENV_FILE="$ROOT_DIR/.env.azure"
printf 'FRONTEND_URL=%s\nBACKEND_URL=%s\n' "$FRONTEND_URL" "$BACKEND_URL" > "$ENV_FILE"
printf '\nDone. Frontend URL:\n  %s\n' "$FRONTEND_URL"
