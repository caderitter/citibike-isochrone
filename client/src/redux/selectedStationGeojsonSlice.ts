import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { Feature, Point } from "geojson";

export type SelectedStationGeojson = Feature<Point> | undefined;

export type SelectedStationGeojsonState = {
  selectedStationGeojson: SelectedStationGeojson;
};

const initialState: SelectedStationGeojsonState = {
  selectedStationGeojson: undefined,
};

export const selectedStationGeojsonSlice = createSlice({
  name: "selectedStationGeojson",
  initialState,
  reducers: {
    setSelectedStationGeojson: (state, action: PayloadAction<SelectedStationGeojson>) => {
      state.selectedStationGeojson = action.payload;
    },
  },
});

export const { setSelectedStationGeojson } = selectedStationGeojsonSlice.actions;

export default selectedStationGeojsonSlice.reducer;
