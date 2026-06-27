#!/usr/bin/env bash
set -euo pipefail

CONFIG_PATH=/config.json
# TODO: determine a reasonable value
THREADS=${THREADS:-1}

config_opts=(
  --loki-use-connectivity false
  --thor-costmatrix-allow-second-pass true
)

# TODO: experiment with the following
#
# Options for controlling memory with tile dir:
#
#   --mjolnir-max-cache-size MJOLNIR_MAX_CACHE_SIZE
#                         Number of bytes per thread used to store tile data in
#                         memory (default: 1000000000)
#   --mjolnir-use-lru-mem-cache MJOLNIR_USE_LRU_MEM_CACHE
#                         Use memory cache with LRU eviction policy (default:
#                         False)
#   --mjolnir-lru-mem-cache-hard-control MJOLNIR_LRU_MEM_CACHE_HARD_CONTROL
#                         Use hard memory limit control for LRU memory cache
#                         (i.e. on every put) - never allow overcommit (default:
#                         False)
#
# For tiles over HTTP:
#
#   --mjolnir-max-concurrent-reader-users MJOLNIR_MAX_CONCURRENT_READER_USERS
#                         number of threads in the threadpool which can be used
#                         to fetch tiles over the network via curl (default: 1)

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