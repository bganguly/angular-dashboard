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
if ! command -v az >/dev/null 2>&1; then
  printf '\naz CLI not found.\n'
  if command -v brew >/dev/null 2>&1; then
    printf 'Installing via Homebrew…\n'
    brew install azure-cli
  else
    printf 'Install: https://docs.microsoft.com/cli/azure/install-azure-cli\n'
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

BACKEND_URL="${BACKEND_URL:-}"
if [[ -z "$BACKEND_URL" ]]; then
  printf '\nEnter Spring Boot backend URL (e.g. https://xxx.azurecontainerapps.io): '
  read -r BACKEND_URL
  [[ -n "$BACKEND_URL" ]] || { printf 'Backend URL required.\n' >&2; exit 1; }
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
