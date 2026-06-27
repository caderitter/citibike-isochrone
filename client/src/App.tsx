import Map, {
  Layer,
  Source,
  type CircleLayerSpecification,
  type FillLayerSpecification,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import "./App.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FeatureCollection, Feature, Polygon, Point, MultiPolygon } from "geojson";
import { featureCollection, point } from "@turf/helpers";
import intersect from "@turf/intersect";
import concave from "@turf/concave";

const CITIBIKE_STATIONS_SOURCE_ID = "citibike-stations-source";
const CITIBIKE_STATIONS_LAYER_ID = "citibike-stations-layer";
const CITIBIKE_GEOJSON_STATION_ID_KEY = "station_id";

const ISOCHRONE_SOURCE_ID = "isochrone-source";
const ISOCHRONE_LAYER_ID = "isochrone-layer";

const CITIBIKE_STATIONS_LAYER_STYLE: CircleLayerSpecification = {
  id: CITIBIKE_STATIONS_LAYER_ID,
  source: CITIBIKE_STATIONS_SOURCE_ID,
  type: "circle",
  paint: {
    "circle-radius": ["case", ["boolean", ["feature-state", "hover"], false], 10, 5],
    "circle-color": "#007cbf",
  },
};

const ISOCHRONE_LAYER_STYLE: FillLayerSpecification = {
  id: ISOCHRONE_LAYER_ID,
  source: ISOCHRONE_SOURCE_ID,
  type: "fill",
  paint: {
    "fill-color": ["get", "color"],
    "fill-opacity": ["get", "opacity"],
  },
};

const CLIP_TO_EXISTING_STATIONS = true;

const MAP_STYLE_URL = `https://api.maptiler.com/maps/dataviz-v4/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`;

function hullFromStations(stations: FeatureCollection<Point>) {
  const points = stations.features.map(({ geometry }) =>
    point([geometry.coordinates[0], geometry.coordinates[1]]),
  );
  return concave(featureCollection(points), { units: "meters", maxEdge: 5000 });
}

function clipIsochroneToStationArea(
  isochrone: Feature<Polygon | MultiPolygon>,
  stationHull: Feature<Polygon | MultiPolygon>,
): Feature<Polygon | MultiPolygon> {
  return {
    ...intersect(featureCollection([isochrone, stationHull]))!,
    properties: { ...isochrone.properties },
  };
}

function clipAllContours(
  isochrones: FeatureCollection<Polygon | MultiPolygon>,
  stationHull: Feature<Polygon | MultiPolygon>,
): FeatureCollection<Polygon | MultiPolygon> {
  const features = isochrones.features.map((feature) =>
    clipIsochroneToStationArea(feature, stationHull),
  );

  return { type: "FeatureCollection", features };
}

export function App() {
  const [citibikeGeoJson, setCitibikeGeoJson] = useState<FeatureCollection<Point>>();
  const [isochroneGeoJson, setIsochroneGeoJson] =
    useState<FeatureCollection<Polygon | MultiPolygon>>();
  const mapRef = useRef<MapRef>(null);
  const hoveredFeatureIdRef = useRef<string | number>(null);

  const stationHull = useMemo(() => {
    if (citibikeGeoJson) {
      return hullFromStations(citibikeGeoJson);
    }
  }, [citibikeGeoJson]);

  const handleClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];

      if (feature && feature.geometry.type === "Point") {
        const query = new URLSearchParams({
          lat: feature.geometry.coordinates[1].toString(),
          lon: feature.geometry.coordinates[0].toString(),
          costing: "bicycle",
        });
        fetch(`${import.meta.env.VITE_SERVER_ENDPOINT}/isochrone?${query}`, { method: "POST" })
          .then((res) => res.json())
          .then((featureCollection: FeatureCollection<Polygon>) => {
            if (CLIP_TO_EXISTING_STATIONS) {
              const clippedIsochrone = clipAllContours(featureCollection, stationHull!);
              setIsochroneGeoJson(clippedIsochrone);
            } else {
              setIsochroneGeoJson(featureCollection);
            }
          });
      }
    },
    [citibikeGeoJson],
  );

  const handleMouseMove = useCallback((event: MapLayerMouseEvent) => {
    const map = mapRef?.current?.getMap();
    if (!map) return;

    const feature = event.features?.[0];

    if (hoveredFeatureIdRef.current !== null) {
      map.setFeatureState(
        { source: CITIBIKE_STATIONS_SOURCE_ID, id: hoveredFeatureIdRef.current },
        { hover: false },
      );
    }

    if (feature?.id !== undefined) {
      map.setFeatureState({ source: CITIBIKE_STATIONS_SOURCE_ID, id: feature.id }, { hover: true });
      hoveredFeatureIdRef.current = feature.id;
      map.getCanvas().style.cursor = "pointer";
    } else {
      hoveredFeatureIdRef.current = null;
      map.getCanvas().style.cursor = "";
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    if (hoveredFeatureIdRef.current !== null) {
      map.setFeatureState(
        { source: CITIBIKE_STATIONS_SOURCE_ID, id: hoveredFeatureIdRef.current },
        { hover: false },
      );
      hoveredFeatureIdRef.current = null;
    }
    map.getCanvas().style.cursor = "";
  }, []);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_SERVER_ENDPOINT}/geojson`, { mode: "cors" })
      .then((res) => res.json())
      .then((json) => setCitibikeGeoJson(json));
  }, []);

  return (
    <Map
      ref={mapRef}
      initialViewState={{
        latitude: 40.7128,
        longitude: -74.006,
        zoom: 10,
      }}
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: "100%",
        height: "100%",
      }}
      mapStyle={MAP_STYLE_URL}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseLeave}
      interactiveLayerIds={[CITIBIKE_STATIONS_LAYER_ID]}
    >
      {citibikeGeoJson && (
        <Source
          id={CITIBIKE_STATIONS_SOURCE_ID}
          type="geojson"
          data={citibikeGeoJson}
          promoteId={CITIBIKE_GEOJSON_STATION_ID_KEY}
        >
          <Layer {...CITIBIKE_STATIONS_LAYER_STYLE} />
        </Source>
      )}
      {isochroneGeoJson && (
        <Source id={ISOCHRONE_SOURCE_ID} type="geojson" data={isochroneGeoJson}>
          <Layer {...ISOCHRONE_LAYER_STYLE} />
        </Source>
      )}
    </Map>
  );
}
