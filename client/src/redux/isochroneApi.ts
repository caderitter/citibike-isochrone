import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { FeatureCollection, Polygon, MultiPolygon } from "geojson";

export const isochroneApi = createApi({
  reducerPath: "isochroneApi",
  baseQuery: fetchBaseQuery({ baseUrl: "https://localhost:5001/" }),
  endpoints: (builder) => ({
    getIsochrone: builder.query<FeatureCollection<Polygon | MultiPolygon>, [number, number]>({
      query: (arg) => {
        const params = new URLSearchParams({
          lat: arg[0].toString(),
          lon: arg[1].toString(),
        });

        return { url: `isochrone?${params}` };
      },
    }),
  }),
});

export const { useLazyGetIsochroneQuery } = isochroneApi;
