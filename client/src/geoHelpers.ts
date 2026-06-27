import concave from "@turf/concave";
import { point, featureCollection } from "@turf/helpers";
import intersect from "@turf/intersect";
import type { FeatureCollection, Polygon, MultiPolygon, Point, Feature } from "geojson";

export function hullFromStations(stations: FeatureCollection<Point>) {
  const points = stations.features.map(({ geometry }) =>
    point([geometry.coordinates[0], geometry.coordinates[1]]),
  );
  return concave(featureCollection(points), { units: "meters", maxEdge: 5000 });
}

export function clipIsochroneToStationArea(
  isochrone: Feature<Polygon | MultiPolygon>,
  stationHull: Feature<Polygon | MultiPolygon>,
): Feature<Polygon | MultiPolygon> {
  return {
    ...intersect(featureCollection([isochrone, stationHull]))!,
    properties: { ...isochrone.properties },
  };
}

export function clipAllContours(
  isochrones: FeatureCollection<Polygon | MultiPolygon>,
  stationHull: Feature<Polygon | MultiPolygon>,
): FeatureCollection<Polygon | MultiPolygon> {
  const features = isochrones.features.map((feature) =>
    clipIsochroneToStationArea(feature, stationHull),
  );

  return { type: "FeatureCollection", features };
}
