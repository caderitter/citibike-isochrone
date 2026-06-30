import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export type Step = 0 | 1 | 2;

export type HoverInfo = { lat: number; lon: number; text: string } | undefined;

export type UiState = {
  step: 0 | 1 | 2;
  limitToStations: boolean;
  hoverInfo: HoverInfo;
};

const initialState: UiState = {
  step: 0,
  limitToStations: true,
  hoverInfo: undefined,
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setStep: (state, action: PayloadAction<Step>) => {
      state.step = action.payload;
    },
    setLimitToStations: (state, action: PayloadAction<boolean>) => {
      state.limitToStations = action.payload;
    },
    setHoverInfo: (state, action: PayloadAction<HoverInfo>) => {
      state.hoverInfo = action.payload;
    },
  },
});

export const { setStep, setLimitToStations, setHoverInfo } = uiSlice.actions;

export default uiSlice.reducer;
