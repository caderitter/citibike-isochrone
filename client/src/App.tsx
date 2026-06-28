import { useState } from "react";
import { Map } from "./Map";
import { Panel } from "./Panel";

export type Step = 0 | 1 | 2;

export function App() {
  const [step, setStep] = useState<Step>(0);
  const [limitToStations, setLimitToStations] = useState(true);
  return (
    <>
      <Panel
        step={step}
        setStep={setStep}
        limitToStations={limitToStations}
        setLimitToStations={setLimitToStations}
      />
      <Map step={step} setStep={setStep} limitToStations={limitToStations} />
    </>
  );
}
