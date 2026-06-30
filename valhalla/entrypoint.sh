#!/usr/bin/env bash
set -euo pipefail

CONFIG_PATH=/config.json

THREADS=${THREADS:-1}

config_opts=(
  --loki-use-connectivity false
  --thor-costmatrix-allow-second-pass true
)

if [[ -n ${TILE_URL:-} ]]; then
  config_opts+=(
    --mjolnir-tile-url "$TILE_URL"
  )
elif [[ -n ${TILE_DIR:-} ]]; then
  config_opts+=(
    --mjolnir-tile-dir "$TILE_DIR"
  )
elif [[ -n ${TILE_PATH:-} ]]; then
  config_opts+=(
    --mjolnir-tile-extract "$TILE_PATH"
  )
else
  echo 'error: tile misconfiguration' >&2
  exit 1
fi

valhalla_build_config "${config_opts[@]}" >"$CONFIG_PATH"

exec valhalla_service "$CONFIG_PATH" "$THREADS"