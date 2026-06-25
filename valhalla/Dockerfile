FROM ghcr.io/valhalla/valhalla:3.7.0

ENV CONFIG_PATH=/config.json

RUN valhalla_build_config >$CONFIG_PATH

COPY ./entrypoint.sh /entrypoint.sh

ENTRYPOINT /entrypoint.sh
