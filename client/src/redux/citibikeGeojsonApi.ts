import { createSelector } from "@reduxjs/toolkit";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { FeatureCollection, Point } from "geojson";
import { hullFromStations } from "../geoHelpers";
import { CITIBIKE_STATIONS_ICON_LAYER_ID, CITIBIKE_STATIONS_SOURCE_ID, CITIBIKE_ICON_IMAGE } from "../constants";

export const citibikeGeojsonApi = createApi({
  reducerPath: "citibikeGeojsonApi",
  baseQuery: fetchBaseQuery({ baseUrl: "https://localhost:5001/" }),
  endpoints: (builder) => ({
    getCitibikeGeojson: builder.query<FeatureCollection<Point>, void>({
      query: () => "geojson",
    }),
  }),
});

export const stationHullSelector = createSelector(
  [citibikeGeojsonApi.endpoints.getCitibikeGeojson.select()],
  ({ data }) => {
    if (data) {
      return hullFromStations(data);
    }
  },
);

export const citibikeLayerStyleSelector = createSelector([citibikeGeojsonApi.endpoints.getCitibikeGeojson.select()], ({data}) => ({
  id: CITIBIKE_STATIONS_ICON_LAYER_ID,
  source: CITIBIKE_STATIONS_SOURCE_ID,
  type: "symbol",
  layout: {
    "icon-image": CITIBIKE_ICON_IMAGE,
    "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.08, 20, 0.4],
    "icon-allow-overlap": true,
    visibility: data ? "none" : "visible",
  },
}))

export const { useGetCitibikeGeojsonQuery } = citibikeGeojsonApi;
