# Citibike isochrone tool

## Setting up Valhalla

- Download BBBike's OSM export for NYC: https://download.bbbike.org/osm/bbbike/NewYork/NewYork.osm.gz
- Extract `area.osm` to `/valhalla`
- Generate the valhalla tiles and config file:
```bash
cd `/valhalla`
docker run --rm \                       
  -v $(pwd):/data \
  ghcr.io/valhalla/valhalla:3.7.0 \
  valhalla_build_tiles -c /data/valhalla.json /data/area.osm
tar -cf tiles.tar valhalla_tiles/
cp tiles.tar valhalla/tiles.tar

docker run --rm \
  -v $(pwd):/data \
  ghcr.io/valhalla/valhalla:3.7.0 \
  valhalla_build_config \
  --mjolnir-tile-dir /data/valhalla_tiles > valhalla.json
```
- Run valhalla: `docker-compose up`