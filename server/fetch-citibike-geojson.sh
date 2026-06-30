#!/usr/bin/env bash
set -euo pipefail

URL="https://raw.githubusercontent.com/MaxHalford/bike-sharing-history/main/data/stations/new-york-city/citibike.geojson"
DEST="$APP_HOME/server/data/citibike.geojson"
TMP="$(mktemp)"

curl -sSL --fail -o "$TMP" "$URL"

# remove unnecessary properties from each feature
jq '.features |= map(.properties |= {name, station_id})' "$TMP" > "$DEST";