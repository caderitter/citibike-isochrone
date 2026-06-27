import MaplibreMap, {
  Layer,
  Source,
  type FillLayerSpecification,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FeatureCollection, Polygon, Point, MultiPolygon } from "geojson";
import bikePng from "./assets/icon-park-outline--bike.png";
import type { MapLibreEvent, SymbolLayerSpecification } from "maplibre-gl";
import { hullFromStations, clipAllContours } from "./geoHelpers";

const CITIBIKE_ICON_IMAGE = "citibike-icon";

const CITIBIKE_STATIONS_SOURCE_ID = "citibike-stations-source";
const CITIBIKE_STATIONS_ICON_LAYER_ID = "citibike-stations-icon-layer";
const CITIBIKE_STATIONS_BACKGROUND_LAYER_ID = "citibike-stations-background-layer";

const CITIBIKE_GEOJSON_STATION_ID_KEY = "station_id";

const ISOCHRONE_SOURCE_ID = "isochrone-source";
const ISOCHRONE_LAYER_ID = "isochrone-layer";

const CITIBIKE_STATIONS_ICON_LAYER_STYLE: SymbolLayerSpecification = {
  id: CITIBIKE_STATIONS_ICON_LAYER_ID,
  source: CITIBIKE_STATIONS_SOURCE_ID,
  type: "symbol",
  layout: {
    "icon-image": CITIBIKE_ICON_IMAGE,
    "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.08, 20, 0.4],
    "icon-allow-overlap": true,
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

export function Map() {
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
    async (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];

      if (feature && feature.geometry.type === "Point") {
        const query = new URLSearchParams({
          lat: feature.geometry.coordinates[1].toString(),
          lon: feature.geometry.coordinates[0].toString(),
          costing: "bicycle",
        });
        const res = await fetch(`${import.meta.env.VITE_SERVER_ENDPOINT}/isochrone?${query}`, {
          method: "POST",
        });
        const featureCollection = await res.json();
        if (CLIP_TO_EXISTING_STATIONS) {
          const clippedIsochrone = clipAllContours(featureCollection, stationHull!);
          setIsochroneGeoJson(clippedIsochrone);
        } else {
          setIsochroneGeoJson(featureCollection);
        }
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

  const handleMapLoad = useCallback(async (event: MapLibreEvent) => {
    const map = event.target;

    try {
      const imageResponse = await map.loadImage(bikePng);
      if (!map.hasImage(CITIBIKE_ICON_IMAGE)) {
        map.addImage(CITIBIKE_ICON_IMAGE, imageResponse.data);
      }
    } catch (e) {
      console.error("Error loading icon image:", e);
    }
  }, []);

  useEffect(() => {
    const fetchGeojson = async () => {
      const res = await fetch(`${import.meta.env.VITE_SERVER_ENDPOINT}/geojson`, { mode: "cors" });
      const json = await res.json();
      setCitibikeGeoJson(json);
    };
    fetchGeojson();
  }, []);

  return (
    <MaplibreMap
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
      onLoad={handleMapLoad}
      interactiveLayerIds={[CITIBIKE_STATIONS_ICON_LAYER_ID, CITIBIKE_STATIONS_BACKGROUND_LAYER_ID]}
    >
      {isochroneGeoJson && (
        <Source id={ISOCHRONE_SOURCE_ID} type="geojson" data={isochroneGeoJson}>
          <Layer {...ISOCHRONE_LAYER_STYLE} beforeId={CITIBIKE_STATIONS_ICON_LAYER_ID} />
        </Source>
      )}
      {citibikeGeoJson && (
        <Source
          id={CITIBIKE_STATIONS_SOURCE_ID}
          type="geojson"
          data={citibikeGeoJson}
          promoteId={CITIBIKE_GEOJSON_STATION_ID_KEY}
        >
          <Layer {...CITIBIKE_STATIONS_ICON_LAYER_STYLE} />
        </Source>
      )}
    </MaplibreMap>
  );
}
