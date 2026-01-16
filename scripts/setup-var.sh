#!/usr/bin/env bash
set -euo pipefail

ADMIN_ROOT="/var/berrymx"
DATA_DIR="${ADMIN_ROOT}/data"
KEYS_DIR="${ADMIN_ROOT}/keys"
ENV_FILE="${ADMIN_ROOT}/berrymx.env"
SRC_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

mkdir -p "${DATA_DIR}" "${KEYS_DIR}"

for f in "${SRC_ROOT}"/data/*.json; do
  base="$(basename "${f}")"
  if [ ! -f "${DATA_DIR}/${base}" ]; then
    cp "${f}" "${DATA_DIR}/${base}"
  fi
done

cat > "${ENV_FILE}" <<'EOF'
BERRYMX_ADMIN_ROOT=/var/berrymx
BERRYMX_DATA_DIR=/var/berrymx/data
BERRYMX_KEYS_DIR=/var/berrymx/keys
BERRYMX_ALLOWED_SIGNERS=/var/berrymx/keys/allowed_signers
SSH_NAMESPACE=berrymx-api
EOF
chmod 644 "${ENV_FILE}"

if [ ! -f "${KEYS_DIR}/berrymx_admin" ]; then
  ssh-keygen -t ed25519 -f "${KEYS_DIR}/berrymx_admin" -C berrymx-admin@local -N ""
fi

chmod 600 "${KEYS_DIR}/berrymx_admin"
chmod 644 "${KEYS_DIR}/berrymx_admin.pub"

pub="$(cat "${KEYS_DIR}/berrymx_admin.pub")"
if [ -f "${KEYS_DIR}/allowed_signers" ]; then
  cp "${KEYS_DIR}/allowed_signers" "${KEYS_DIR}/allowed_signers.bak"
  grep -v '^berrymx-admin ' "${KEYS_DIR}/allowed_signers.bak" > "${KEYS_DIR}/allowed_signers"
fi
printf 'berrymx-admin %s\n' "${pub}" >> "${KEYS_DIR}/allowed_signers"
chmod 644 "${KEYS_DIR}/allowed_signers"
