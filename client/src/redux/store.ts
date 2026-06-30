import { configureStore } from "@reduxjs/toolkit";
import { citibikeGeojsonApi } from "./citibikeGeojsonApi";
import { isochroneApi } from "./isochroneApi";
import uiReducer from "./uiSlice";
import selectedStationGeojsonReducer from "./selectedStationGeojsonSlice";

export const store = configureStore({
  reducer: {
    [citibikeGeojsonApi.reducerPath]: citibikeGeojsonApi.reducer,
    [isochroneApi.reducerPath]: isochroneApi.reducer,
    ui: uiReducer,
    selectedStationGeojson: selectedStationGeojsonReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat([citibikeGeojsonApi.middleware, isochroneApi.middleware]),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
