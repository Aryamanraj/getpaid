#!/usr/bin/env bash
# Interactive setter for the deploy-time core.PlatformConfig values
# (docs/PLATFORM_CONFIG_KEYS.md). Secrets are read with terminal echo off and
# handed to curl over stdin / process substitution, so no value ever appears
# on screen, in shell history, or in `ps` argv.
#
# Blank input skips a key. Safe to re-run any time — set is an upsert.
# JWT secrets are not asked for: the API generates them itself on first boot.
set -euo pipefail

API_DEFAULT='https://api.payee.id/api/v1'
read -r -p "API base URL [$API_DEFAULT]: " API
API=${API:-$API_DEFAULT}

read -r -s -p 'ADMIN_API_KEY (hidden): ' ADMIN_API_KEY
echo
[[ -n $ADMIN_API_KEY ]] || { echo 'ADMIN_API_KEY is required' >&2; exit 1; }

FAILED=0

json_escape() {
  local s=${1//\\/\\\\}
  s=${s//\"/\\\"}
  printf '%s' "$s"
}

put() { # key, json-value
  local key=$1 value=$2 code
  code=$(printf '{"key":"%s","value":%s}' "$key" "$value" |
    curl -sS -o /dev/null -w '%{http_code}' -X POST "$API/platformConfig/set" \
      -H 'content-type: application/json' \
      --config <(printf 'header = "x-api-key: %s"\n' "$ADMIN_API_KEY") \
      -d @-) || code=000
  if [[ $code == 2* ]]; then
    echo "  set $key"
  else
    echo "  FAILED $key (HTTP $code)" >&2
    FAILED=1
  fi
}

ask_string() { # key, prompt, hidden?
  local key=$1 prompt=$2 hidden=${3:-hidden} raw
  if [[ $hidden == hidden ]]; then
    read -r -s -p "$prompt (hidden, blank to skip): " raw
    echo
  else
    read -r -p "$prompt (blank to skip): " raw
  fi
  [[ -z $raw ]] && { echo "  skipped $key"; return; }
  put "$key" "\"$(json_escape "$raw")\""
}

ask_url_array() { # key, prompt — ordered fallback list, first is primary
  local key=$1 raw p joined=''
  read -r -s -p "$2 — URL or comma-separated URLs (hidden, blank to skip): " raw
  echo
  [[ -z $raw ]] && { echo "  skipped $key"; return; }
  local IFS=','
  for p in $raw; do
    p=${p// /}
    [[ -z $p ]] && continue
    joined+="${joined:+,}\"$(json_escape "$p")\""
  done
  [[ -z $joined ]] && { echo "  skipped $key"; return; }
  put "$key" "[$joined]"
}

echo
echo '── chain RPC endpoints (with your API keys in the URL) ──'
ask_url_array 'chain.eip155.1.rpcUrls' 'Ethereum mainnet RPC'
ask_url_array 'chain.eip155.8453.rpcUrls' 'Base RPC'
ask_url_array 'chain.eip155.42161.rpcUrls' 'Arbitrum One RPC'
ask_url_array 'chain.eip155.137.rpcUrls' 'Polygon RPC'
ask_url_array 'chain.solana.mainnet.rpcUrls' 'Solana mainnet RPC'
ask_string 'chain.tron.apiKey' 'TronGrid API key'

echo
echo '── mail (Novu Cloud) ──'
ask_string 'mail.novu.apiKey' 'Novu secret key'

echo
echo '── web (public by design — shown while typing) ──'
ask_string 'web.walletconnectProjectId' 'WalletConnect project ID' visible
ask_string 'web.solanaRpcUrl' 'Browser Solana RPC URL' visible

echo
if [[ $FAILED == 1 ]]; then
  echo 'Some keys failed — fix and re-run; successful keys need no re-entry.' >&2
  exit 1
fi
echo 'Done. Values are AES-encrypted at rest and cannot be read back.'
