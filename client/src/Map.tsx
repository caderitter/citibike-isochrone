import MaplibreMap, {
  Layer,
  Popup,
  Source,
  type FillLayerSpecification,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { Point, Feature } from "geojson";
import bikePng from "./assets/icon-park-outline--bike.png";
import { type MapLibreEvent, type SymbolLayerSpecification } from "maplibre-gl";
import { clipAllContours } from "./geoHelpers";
import { MAX_RIDE_TIME, RIDE_LENGTH_AT_SUBWAY_COST } from "./constants";
import bbox from "@turf/bbox";
import type { RootState } from "./redux/store";
import { stationHullSelector, useGetCitibikeGeojsonQuery } from "./redux/citibikeGeojsonApi";
import { useLazyGetIsochroneQuery } from "./redux/isochroneApi";
import { setHoverInfo, setStep } from "./redux/uiSlice";
import { setSelectedStationGeojson } from "./redux/selectedStationGeojsonSlice";

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

const MAP_STYLE_URL = `https://api.maptiler.com/maps/dataviz-v4/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`;

export function Map() {
  const dispatch = useDispatch();
  const mapRef = useRef<MapRef>(null);

  const step = useSelector((state: RootState) => state.ui.step);
  const limitToStations = useSelector((state: RootState) => state.ui.limitToStations);
  const hoverInfo = useSelector((state: RootState) => state.ui.hoverInfo);
  const stationHull = useSelector(stationHullSelector);
  const selectedStationGeojson = useSelector(
    (state: RootState) => state.selectedStationGeojson.selectedStationGeojson,
  );

  const { data: citibikeGeojson } = useGetCitibikeGeojsonQuery();
  const [fetchIsochrone, { isochroneGeojson }] = useLazyGetIsochroneQuery({
    selectFromResult: ({ data }) => ({
      isochroneGeojson: data
        ? limitToStations
          ? clipAllContours(data, stationHull!)
          : data
        : undefined,
    }),
  });

  const citibikeStationsIconLayerStyle: SymbolLayerSpecification = useMemo(
    () => ({
      id: CITIBIKE_STATIONS_ICON_LAYER_ID,
      source: CITIBIKE_STATIONS_SOURCE_ID,
      type: "symbol",
      layout: {
        "icon-image": CITIBIKE_ICON_IMAGE,
        "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.08, 20, 0.4],
        "icon-allow-overlap": true,
        visibility: selectedStationGeojson ? "none" : "visible",
      },
    }),
    [selectedStationGeojson],
  );

  const currentPriceIsochroneLayerStyle: FillLayerSpecification = useMemo(
    () => ({
      id: CURRENT_PRICE_ISOCHRONE_LAYER_ID,
      source: CURRENT_PRICE_ISOCHRONE_SOURCE_ID,
      ...SHARED_ISOCHRONE_STYLE,
      paint: {
        ...SHARED_ISOCHRONE_STYLE.paint,
        "fill-opacity": step === 1 || step === 2 ? 0.3 : 0,
        "fill-opacity-transition": { duration: 750 },
      },
    }),
    [step],
  );

  const proposalPriceIsochroneLayerStyle: FillLayerSpecification = useMemo(
    () => ({
      id: PROPOSAL_PRICE_ISOCHRONE_LAYER_ID,
      source: PROPOSAL_PRICE_ISOCHRONE_SOURCE_ID,
      ...SHARED_ISOCHRONE_STYLE,
      paint: {
        ...SHARED_ISOCHRONE_STYLE.paint,
        "fill-opacity": step === 2 ? 0.3 : 0,
        "fill-opacity-transition": { duration: 750 },
      },
    }),
    [step],
  );

  const [currentPriceIsochroneGeojson, proposalPriceIsochroneGeojson] = useMemo(() => {
    if (isochroneGeojson) {
      const current = isochroneGeojson.features.find(
        (f) => f?.properties?.contour === RIDE_LENGTH_AT_SUBWAY_COST,
      );
      const proposal = isochroneGeojson.features.find(
        (f) => f?.properties?.contour === MAX_RIDE_TIME,
      );
      return [current, proposal];
    } else {
      return [undefined, undefined];
    }
  }, [isochroneGeojson]);

  const handleClick = useCallback(
    async (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0] as Feature<Point>;

      if (feature) {
        fetchIsochrone([feature.geometry.coordinates[1], feature.geometry.coordinates[0]]);

        dispatch(
          setSelectedStationGeojson({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: feature.geometry.coordinates,
            },
            properties: { ...feature.properties },
          }),
        );
        dispatch(setStep(1));
      }
    },
    [limitToStations],
  );

  const handleMouseMove = useCallback(
    (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0] as Feature<Point>;
      if (feature && mapRef.current) {
        mapRef.current.getCanvas().style.cursor = "pointer";
        // only show station names on hover when zoomed in
        if (mapRef.current.getZoom() > 13) {
          dispatch(
            setHoverInfo({
              lat: feature.geometry.coordinates[1],
              lon: feature.geometry.coordinates[0],
              text: feature.properties?.name,
            }),
          );
        }
      } else {
        if (mapRef.current) {
          mapRef.current.getCanvas().style.cursor = "";
        }
        dispatch(setHoverInfo(undefined));
      }
    },
    [mapRef],
  );

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
    if (currentPriceIsochroneGeojson && step === 1) {
      const [minLon, minLat, maxLon, maxLat] = bbox(currentPriceIsochroneGeojson);
      mapRef.current?.fitBounds(
        [
          [minLon, minLat],
          [maxLon, maxLat],
        ],
        { padding: 40, duration: 1500 },
      );
    }
  }, [currentPriceIsochroneGeojson, step]);

  useEffect(() => {
    if (proposalPriceIsochroneGeojson && step === 2) {
      const [minLon, minLat, maxLon, maxLat] = bbox(proposalPriceIsochroneGeojson);
      mapRef.current?.fitBounds(
        [
          [minLon, minLat],
          [maxLon, maxLat],
        ],
        { padding: 40, duration: 1500 },
      );
    }
  }, [currentPriceIsochroneGeojson, step]);

  return (
    <MaplibreMap
      ref={mapRef}
      initialViewState={{
        latitude: 40.76,
        longitude: -73.922,
        zoom: 10.5,
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
      onLoad={handleMapLoad}
      interactiveLayerIds={[CITIBIKE_STATIONS_ICON_LAYER_ID]}
    >
      {currentPriceIsochroneGeojson && (
        <Source
          id={CURRENT_PRICE_ISOCHRONE_SOURCE_ID}
          type="geojson"
          data={currentPriceIsochroneGeojson}
        >
          <Layer {...currentPriceIsochroneLayerStyle} beforeId={CITIBIKE_STATIONS_ICON_LAYER_ID} />
        </Source>
      )}
      {proposalPriceIsochroneGeojson && (
        <Source
          id={PROPOSAL_PRICE_ISOCHRONE_SOURCE_ID}
          type="geojson"
          data={proposalPriceIsochroneGeojson}
        >
          <Layer {...proposalPriceIsochroneLayerStyle} beforeId={CITIBIKE_STATIONS_ICON_LAYER_ID} />
        </Source>
      )}
      {citibikeGeojson && (
        <Source
          id={CITIBIKE_STATIONS_SOURCE_ID}
          type="geojson"
          data={citibikeGeojson}
          promoteId={CITIBIKE_GEOJSON_STATION_ID_KEY}
        >
          <Layer {...citibikeStationsIconLayerStyle} />
        </Source>
      )}
      {selectedStationGeojson && (
        <Source id={SELECTED_STATION_SOURCE_ID} type="geojson" data={selectedStationGeojson}>
          <Layer {...SELECTED_STATION_ICON_LAYER_STYLE} />
        </Source>
      )}
      {hoverInfo && (
        <Popup
          longitude={hoverInfo.lon}
          latitude={hoverInfo.lat}
          closeButton={false}
          closeOnClick={false}
          anchor="bottom"
          offset={[0, -12]}
        >
          <strong>{hoverInfo.text}</strong>
          <p>Click to use this station</p>
        </Popup>
      )}
    </MaplibreMap>
  );
}
