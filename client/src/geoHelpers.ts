import { featureCollection } from "@turf/helpers";
import intersect from "@turf/intersect";
import type { FeatureCollection, Polygon, MultiPolygon, Point, Feature } from "geojson";

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
