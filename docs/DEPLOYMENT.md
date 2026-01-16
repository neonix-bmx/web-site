# Deployment Guide

## Local run
```bash
node server/index.js
```
Open `http://localhost:3000`.

## /var setup
Provision `/var/berrymx` with data, env, and SSH keys:
```bash
sudo ./scripts/setup-var.sh
```

Notes:
- The script copies JSON only if the file does not exist.
- Admin keys live under `/var/berrymx/keys`.

## Environment variables
- `PORT` (default `3000`)
- `SSH_NAMESPACE` (default `berrymx-api`)
- `BERRYMX_ADMIN_ROOT` (default `/var/berrymx`)
- `BERRYMX_DATA_DIR` (default `/var/berrymx/data`)
- `BERRYMX_KEYS_DIR` (default `/var/berrymx/keys`)
- `BERRYMX_ALLOWED_SIGNERS` (default `/var/berrymx/keys/allowed_signers`)
