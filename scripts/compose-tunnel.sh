#!/usr/bin/env bash
set -euo pipefail

mode="${1:-}"
if [[ -z "${mode}" ]]; then
  echo "Usage: $0 {quick|named} <docker compose args...>" >&2
  echo "  quick:  docker-compose.yml + docker-compose.tunnel.yml (random trycloudflare.com URL)" >&2
  echo "  named:  + docker-compose.cloudflare.yml (stable Cloudflare Tunnel via CLOUDFLARED_TOKEN)" >&2
  exit 2
fi
shift

case "${mode}" in
  quick)
    exec docker compose -f docker-compose.yml -f docker-compose.tunnel.yml "$@"
    ;;
  named|cf|cloudflare)
    exec docker compose -f docker-compose.yml -f docker-compose.tunnel.yml -f docker-compose.cloudflare.yml "$@"
    ;;
  *)
    echo "Unknown mode: ${mode}" >&2
    exit 2
    ;;
esac

