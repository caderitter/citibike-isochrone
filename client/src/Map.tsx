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
import { type MapLibreEvent } from "maplibre-gl";
import { clipAllContours } from "./geoHelpers";
import { CITIBIKE_GEOJSON_STATION_ID_KEY, CITIBIKE_ICON_IMAGE, CITIBIKE_STATIONS_ICON_LAYER_ID, CITIBIKE_STATIONS_SOURCE_ID, CURRENT_PRICE_ISOCHRONE_LAYER_ID, CURRENT_PRICE_ISOCHRONE_SOURCE_ID, MAP_STYLE_URL, MAX_RIDE_TIME, PROPOSAL_PRICE_ISOCHRONE_LAYER_ID, PROPOSAL_PRICE_ISOCHRONE_SOURCE_ID, RIDE_LENGTH_AT_SUBWAY_COST, SELECTED_STATION_ICON_LAYER_STYLE, SELECTED_STATION_SOURCE_ID, SHARED_ISOCHRONE_STYLE } from "./constants";
import bbox from "@turf/bbox";
import type { RootState } from "./redux/store";
import { citibikeStationsIconLayerStyleSelector, stationHullSelector, useGetCitibikeGeojsonQuery } from "./redux/citibikeGeojsonApi";
import { useLazyGetIsochroneQuery } from "./redux/isochroneApi";
import { setHoverInfo } from "./redux/uiSlice";
import { setSelectedStationGeojson } from "./redux/selectedStationGeojsonSlice";

export function Map() {
  const dispatch = useDispatch();
  const mapRef = useRef<MapRef>(null);

  const step = useSelector((state: RootState) => state.ui.step);
  const limitToStations = useSelector((state: RootState) => state.ui.limitToStations);
  const hoverInfo = useSelector((state: RootState) => state.ui.hoverInfo);
  const stationHull = useSelector(stationHullSelector);
  const selectedStationGeojson = useSelector((state: RootState) => state.selectedStationGeojson.selectedStationGeojson);
  const citibikeStationsIconLayerStyle = useSelector(citibikeStationsIconLayerStyleSelector);

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

        dispatch(setSelectedStationGeojson({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: feature.geometry.coordinates,
          },
          properties: { ...feature.properties },
        }));
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

  // if we've gone back to step 0, clear the selected station
  if (step === 0 && selectedStationGeojson) {
    dispatch(setSelectedStationGeojson(undefined));
  }

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
