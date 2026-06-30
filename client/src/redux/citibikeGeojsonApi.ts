import { createSelector } from "@reduxjs/toolkit";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { FeatureCollection, Point } from "geojson";
import { hullFromStations } from "../geoHelpers";

export const citibikeGeojsonApi = createApi({
  reducerPath: "citibikeGeojsonApi",
  baseQuery: fetchBaseQuery({ baseUrl: "http://localhost:5001/" }),
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

export const { useGetCitibikeGeojsonQuery } = citibikeGeojsonApi;
