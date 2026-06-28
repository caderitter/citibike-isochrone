import MaplibreMap, {
  Layer,
  Source,
  type FillLayerSpecification,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FeatureCollection, Polygon, Point, MultiPolygon, Feature } from "geojson";
import bikePng from "./assets/icon-park-outline--bike.png";
import type { MapLibreEvent, SymbolLayerSpecification } from "maplibre-gl";
import { hullFromStations, clipAllContours } from "./geoHelpers";
import { MAX_RIDE_TIME, RIDE_LENGTH_AT_SUBWAY_COST } from "./constants";
import bbox from "@turf/bbox";
import type { Step } from "./App";

const CITIBIKE_ICON_IMAGE = "citibike-icon";

const CITIBIKE_STATIONS_SOURCE_ID = "citibike-stations-source";
const CITIBIKE_STATIONS_ICON_LAYER_ID = "citibike-stations-icon-layer";

const SELECTED_STATION_SOURCE_ID = "selected-station-source";
const SELECTED_STATION_ICON_LAYER_ID = "selected-station-icon-layer";

const CITIBIKE_GEOJSON_STATION_ID_KEY = "station_id";

const CURRENT_PRICE_ISOCHRONE_SOURCE_ID = "current-price-isochrone-source";
const CURRENT_PRICE_ISOCHRONE_LAYER_ID = "current-price-isochrone-layer";

const PROPOSAL_PRICE_ISOCHRONE_SOURCE_ID = "proposal-price-isochrone-source";
const PROPOSAL_PRICE_ISOCHRONE_LAYER_ID = "proposal-price-isochrone-layer";

const SELECTED_STATION_ICON_LAYER_STYLE: SymbolLayerSpecification = {
  id: SELECTED_STATION_ICON_LAYER_ID,
  source: SELECTED_STATION_SOURCE_ID,
  type: "symbol",
  layout: {
    "icon-image": CITIBIKE_ICON_IMAGE,
    "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.1, 20, 0.5],
    "icon-allow-overlap": true,
  },
};

const SHARED_ISOCHRONE_STYLE: Pick<FillLayerSpecification, "type" | "paint"> = {
  type: "fill",
  paint: {
    "fill-color": ["get", "color"],
    "fill-opacity": ["get", "opacity"],
  },
};

const CLIP_TO_EXISTING_STATIONS = true;

const MAP_STYLE_URL = `https://api.maptiler.com/maps/dataviz-v4/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`;

export function Map({ step, setStep }: { step: Step; setStep: (step: Step) => void }) {
  const [citibikeGeoJson, setCitibikeGeoJson] = useState<FeatureCollection<Point>>();
  const [selectedStationGeoJson, setSelectedStationGeoJson] = useState<Feature<Point>>();
  const [isochroneGeoJson, setIsochroneGeoJson] =
    useState<FeatureCollection<Polygon | MultiPolygon>>();
  const mapRef = useRef<MapRef>(null);
  const hoveredFeatureIdRef = useRef<string | number>(null);

  const stationHull = useMemo(() => {
    if (citibikeGeoJson) {
      return hullFromStations(citibikeGeoJson);
    }
  }, [citibikeGeoJson]);

  const citibikeStationsIconLayerStyle: SymbolLayerSpecification = useMemo(() => ({
    id: CITIBIKE_STATIONS_ICON_LAYER_ID,
    source: CITIBIKE_STATIONS_SOURCE_ID,
    type: "symbol",
    layout: {
      "icon-image": CITIBIKE_ICON_IMAGE,
      "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.08, 20, 0.4],
      "icon-allow-overlap": true,
      "visibility": selectedStationGeoJson ? 'none' : 'visible'
    },
  }), [selectedStationGeoJson]);

  const currentPriceIsochroneLayerStyle: FillLayerSpecification = useMemo(() => ({
    id: CURRENT_PRICE_ISOCHRONE_LAYER_ID,
    source: CURRENT_PRICE_ISOCHRONE_SOURCE_ID,
    layout: {
      visibility: step === 1 ? 'visible' : 'none',
    },
    ...SHARED_ISOCHRONE_STYLE,
  }), [step]);

  const proposalPriceIsochroneLayerStyle: FillLayerSpecification = useMemo(() => ({
    id: PROPOSAL_PRICE_ISOCHRONE_LAYER_ID,
    source: PROPOSAL_PRICE_ISOCHRONE_SOURCE_ID,
    layout: {
      visibility: step === 2 ? 'visible' : 'none',
    },
    ...SHARED_ISOCHRONE_STYLE,
  }), [step]);

  const [currentPriceIsochroneGeojson, proposalPriceIsochroneGeojson] = useMemo(() => {
    if (isochroneGeoJson) {
      const current = isochroneGeoJson.features.find(f => f?.properties?.contour === RIDE_LENGTH_AT_SUBWAY_COST);
      const proposal = isochroneGeoJson.features.find(f => f?.properties?.contour === MAX_RIDE_TIME);
      return [current, proposal];
    } else {
      return [undefined, undefined];
    }
  }, [isochroneGeoJson]);

  const handleClick = useCallback(
    async (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0] as Feature<Point>;
      setSelectedStationGeoJson({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: feature.geometry.coordinates
        },
        properties: { ...feature.properties }
      });

      if (feature) {
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

        setStep(1);
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

  useEffect(() => {
    if (currentPriceIsochroneGeojson && step === 1) {
      const [minLon, minLat, maxLon, maxLat] = bbox(currentPriceIsochroneGeojson)
      mapRef.current?.fitBounds([[minLon, minLat], [maxLon, maxLat]], { padding: 40, duration: 2000 })
    }
  }, [currentPriceIsochroneGeojson, step]);

  useEffect(() => {
    if (proposalPriceIsochroneGeojson && step === 2) {
      const [minLon, minLat, maxLon, maxLat] = bbox(proposalPriceIsochroneGeojson)
      mapRef.current?.fitBounds([[minLon, minLat], [maxLon, maxLat]], { padding: 40, duration: 2000 })
    }
  }, [currentPriceIsochroneGeojson, step]);

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
      minZoom={10}
      maxZoom={15}
      mapStyle={MAP_STYLE_URL}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseLeave}
      onLoad={handleMapLoad}
      interactiveLayerIds={[CITIBIKE_STATIONS_ICON_LAYER_ID]}
    >
      {currentPriceIsochroneGeojson && (
        <Source id={CURRENT_PRICE_ISOCHRONE_SOURCE_ID} type="geojson" data={currentPriceIsochroneGeojson}>
          <Layer {...currentPriceIsochroneLayerStyle} beforeId={CITIBIKE_STATIONS_ICON_LAYER_ID} />
        </Source>
      )}
      {proposalPriceIsochroneGeojson && (
        <Source id={PROPOSAL_PRICE_ISOCHRONE_SOURCE_ID} type="geojson" data={proposalPriceIsochroneGeojson}>
          <Layer {...proposalPriceIsochroneLayerStyle} beforeId={CITIBIKE_STATIONS_ICON_LAYER_ID} />
        </Source>
      )}
      {citibikeGeoJson && (
        <Source
          id={CITIBIKE_STATIONS_SOURCE_ID}
          type="geojson"
          data={citibikeGeoJson}
          promoteId={CITIBIKE_GEOJSON_STATION_ID_KEY}
        >
          <Layer {...citibikeStationsIconLayerStyle} />
        </Source>
      )}
      {selectedStationGeoJson && (
        <Source id={SELECTED_STATION_SOURCE_ID} type="geojson" data={selectedStationGeoJson}>
          <Layer {...SELECTED_STATION_ICON_LAYER_STYLE} />
        </Source>
      )}
    </MaplibreMap>
  );
}
