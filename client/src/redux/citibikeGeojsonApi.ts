import { createSelector } from "@reduxjs/toolkit";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { FeatureCollection, Point } from "geojson";
import { concave } from "@turf/concave";

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
      return concave(data, { units: "meters", maxEdge: 5000 });
    }
  },
);

export const { useGetCitibikeGeojsonQuery } = citibikeGeojsonApi;
