import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "./redux/store";
import InfoTooltip from "./InfoTooltip";
import "./Panel.css";
import "./loader.css";
import { setLimitToStations, setStep } from "./redux/uiSlice";
import { setSelectedStationGeojson } from "./redux/selectedStationGeojsonSlice";

export function Panel() {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) =>
    Object.values(state.isochroneApi.queries).some((q) => q?.status === "pending"),
  );
  const step = useSelector((state: RootState) => state.ui.step);
  const limitToStations = useSelector((state: RootState) => state.ui.limitToStations);

  return (
    <div className="panel">
      <h2>Citibike accessibility</h2>
      <div className="content">
        {loading && (
          <div className="loadingOverlay">
            <span className="loader" />
          </div>
        )}
        {step === 0 && (
          <>
            <p>
              Use this tool to see how far you can get with <strong>$3</strong> on a Citibike E-bike
              with a membership.
            </p>
            <p>To get started, zoom in to find your local station and click on it.</p>
            <div>
              <input
                id="limitToStations"
                name="limitToStations"
                type="checkbox"
                checked={limitToStations}
                onChange={(e) => dispatch(setLimitToStations(e.target.checked))}
              />
              <label htmlFor="limitToStations">
                <small>Limit analysis to station-to-station journeys </small>
                <InfoTooltip text="Since every Citibike trip must end at another station, we aren't considering paths that end anywhere else by default. You can uncheck this to show all possible paths." />
              </label>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <p>
              This is the current area you can ride to with <strong>$3</strong> — about 11 minutes
              at $0.27 per minute.
            </p>
            <p>
              Next, click the button below to see how far you could get for the same price if we
              capped the fares.
            </p>
            <button className="button-primary" onClick={() => dispatch(setStep(2))}>
              Cap Citibike fares
            </button>
          </>
        )}
        {step === 2 && (
          <>
            <p>
              This is how far you could ride if we <strong>capped Citibike fares at $3</strong> for
              all rides under 45 minutes.
            </p>
            <button
              className="button"
              onClick={() => {
                dispatch(setStep(0));
                dispatch(setSelectedStationGeojson(undefined));
              }}
            >
              Try another station
            </button>
          </>
        )}
      </div>
    </div>
  );
}
