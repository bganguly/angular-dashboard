#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA_DIR="$ROOT_DIR/infra"

printf '\nThis will DESTROY all Azure resources for angular-dashboard.\n'
printf 'Continue? [y/N]: '
read -r _CONFIRM
[[ "$_CONFIRM" =~ ^[Yy] ]] || { printf 'Aborted.\n'; exit 0; }

cd "$INFRA_DIR"
terraform init -input=false
terraform destroy -input=false -auto-approve

rm -f "$ROOT_DIR/.env.azure"
printf '\nAll resources destroyed.\n'
