import type { Step } from "./App";
import "./Panel.css";

export function Panel({ step, setStep }: { step: Step; setStep: (step: Step) => void }) {
  return (
    <div className="panel">
      <h2>Citibike accessibility</h2>
      {step === 0 && (
        <>
          <p>Use this tool to see how far you can get with $3 on an Citibike E-bike with a membership.</p>
          <p>To get started, zoom in to click on your local station.</p>
        </>
      )}
      {step === 1 && (
        <>
          <p>This is the current area you can ride to with $3.</p>
          <p>Next, click the button below to see how far you could get for the same price if we capped the fares.</p>
          <button className="button" onClick={() => setStep(2)}>Cap Citibike fares</button>
        </>
      )}
      {step === 2 && (
        <>
          <p>This is how far you could ride if we capped Citibike fares at $3 for all rides under 45 minutes.</p>
        </>
      )}
    </div>
  );
}
