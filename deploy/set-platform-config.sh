#!/usr/bin/env bash
# Interactive setter for the deploy-time core.PlatformConfig values
# (docs/PLATFORM_CONFIG_KEYS.md). Secrets are read with terminal echo off and
# handed to curl over stdin / process substitution, so no value ever appears
# on screen, in shell history, or in `ps` argv.
#
# Blank input skips a key. Safe to re-run any time — set is an upsert.
# JWT secrets are not asked for: the API generates them itself on first boot.
#
# Runs under bash OR zsh, executed as a file or pasted whole into a terminal.
# Paste-safety rules: everything lives in functions (the shell parses a whole
# function before running anything), prompts read straight from /dev/tty, no
# `set -e` (it would stay armed in an interactive shell after a paste), and
# no top-level `exit` (it would close the session) — errors `return` instead.

gp_json_escape() {
  local s=${1//\\/\\\\}
  s=${s//\"/\\\"}
  printf '%s' "$s"
}

gp_ask() { # prompt, hidden|visible -> $GP_REPLY
  GP_REPLY=''
  printf '%s' "$1" >/dev/tty
  if [ "$2" = hidden ]; then
    read -r -s GP_REPLY </dev/tty || return 1
    printf '\n' >/dev/tty
  else
    read -r GP_REPLY </dev/tty || return 1
  fi
}

gp_put() { # key, json-value
  local key=$1 value=$2 code
  code=$(printf '{"key":"%s","value":%s}' "$key" "$value" |
    curl -sS -o /dev/null -w '%{http_code}' -X POST "$GP_API/platformConfig/set" \
      -H 'content-type: application/json' \
      --config <(printf 'header = "x-api-key: %s"\n' "$GP_ADMIN_KEY") \
      -d @-) || code=000
  case $code in
    2*) echo "  set $key" ;;
    *)  echo "  FAILED $key (HTTP $code)" >&2; GP_FAILED=1 ;;
  esac
}

gp_string() { # key, prompt, hidden|visible
  local key=$1
  gp_ask "$2 ($3, blank to skip): " "$3" || { echo "  skipped $key"; return 0; }
  [ -z "$GP_REPLY" ] && { echo "  skipped $key"; return 0; }
  gp_put "$key" "\"$(gp_json_escape "$GP_REPLY")\""
}

gp_url_array() { # key, prompt — ordered fallback list, first is primary
  local key=$1 rest p joined=''
  gp_ask "$2 — URL or comma-separated URLs (hidden, blank to skip): " hidden ||
    { echo "  skipped $key"; return 0; }
  [ -z "$GP_REPLY" ] && { echo "  skipped $key"; return 0; }
  # split on commas without relying on word-splitting (absent in zsh)
  rest="$GP_REPLY,"
  while [ -n "$rest" ]; do
    p=${rest%%,*}
    rest=${rest#*,}
    p=${p// /}
    [ -n "$p" ] && joined+="${joined:+,}\"$(gp_json_escape "$p")\""
  done
  [ -z "$joined" ] && { echo "  skipped $key"; return 0; }
  gp_put "$key" "[$joined]"
}

gp_main() {
  local default='https://api.payee.id/api/v1'
  GP_FAILED=0

  gp_ask "API base URL [$default]: " visible || return 1
  GP_API=${GP_REPLY:-$default}

  gp_ask 'ADMIN_API_KEY (hidden): ' hidden || return 1
  GP_ADMIN_KEY=$GP_REPLY
  [ -n "$GP_ADMIN_KEY" ] || { echo 'ADMIN_API_KEY is required' >&2; return 1; }

  echo
  echo '-- chain RPC endpoints (with your API keys in the URL) --'
  gp_url_array 'chain.eip155.1.rpcUrls' 'Ethereum mainnet RPC'
  gp_url_array 'chain.eip155.8453.rpcUrls' 'Base RPC'
  gp_url_array 'chain.eip155.42161.rpcUrls' 'Arbitrum One RPC'
  gp_url_array 'chain.eip155.137.rpcUrls' 'Polygon RPC'
  gp_url_array 'chain.solana.mainnet.rpcUrls' 'Solana mainnet RPC'
  gp_string 'chain.tron.apiKey' 'TronGrid API key' hidden

  echo
  echo '-- mail (Novu Cloud) --'
  gp_string 'mail.novu.apiKey' 'Novu secret key' hidden

  echo
  echo '-- web (public by design) --'
  gp_string 'web.walletconnectProjectId' 'WalletConnect project ID' visible
  gp_string 'web.solanaRpcUrl' 'Browser Solana RPC URL' visible

  echo
  if [ "$GP_FAILED" = 1 ]; then
    echo 'Some keys failed — fix and re-run; successful keys need no re-entry.' >&2
    return 1
  fi
  echo 'Done. Values are AES-encrypted at rest and cannot be read back.'
}

gp_main
