import type { FillLayerSpecification, SymbolLayerSpecification } from "react-map-gl/maplibre";

const CITIBIKE_PRICE_PER_MIN = 0.27;
const SUBWAY_FARE = 3.0;
export const RIDE_LENGTH_AT_SUBWAY_COST = Number((SUBWAY_FARE / CITIBIKE_PRICE_PER_MIN).toFixed(2));
export const MAX_RIDE_TIME = 45.0;

export const CITIBIKE_ICON_IMAGE = "citibike-icon";

export const CITIBIKE_STATIONS_SOURCE_ID = "citibike-stations-source";
export const CITIBIKE_STATIONS_ICON_LAYER_ID = "citibike-stations-icon-layer";

export const SELECTED_STATION_SOURCE_ID = "selected-station-source";
export const SELECTED_STATION_ICON_LAYER_ID = "selected-station-icon-layer";

export const CITIBIKE_GEOJSON_STATION_ID_KEY = "station_id";

export const CURRENT_PRICE_ISOCHRONE_SOURCE_ID = "current-price-isochrone-source";
export const CURRENT_PRICE_ISOCHRONE_LAYER_ID = "current-price-isochrone-layer";

export const PROPOSAL_PRICE_ISOCHRONE_SOURCE_ID = "proposal-price-isochrone-source";
export const PROPOSAL_PRICE_ISOCHRONE_LAYER_ID = "proposal-price-isochrone-layer";

export const SELECTED_STATION_ICON_LAYER_STYLE: SymbolLayerSpecification = {
  id: SELECTED_STATION_ICON_LAYER_ID,
  source: SELECTED_STATION_SOURCE_ID,
  type: "symbol",
  layout: {
    "icon-image": CITIBIKE_ICON_IMAGE,
    "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.1, 20, 0.5],
    "icon-allow-overlap": true,
  },
};

export const SHARED_ISOCHRONE_STYLE: Pick<FillLayerSpecification, "type" | "paint"> = {
  type: "fill",
  paint: {
    "fill-color": ["get", "color"],
    "fill-opacity": ["get", "opacity"],
  },
};

export const MAP_STYLE_URL = `https://api.maptiler.com/maps/dataviz-v4/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`;
