import { Provider } from "react-redux";
import { Map } from "./Map";
import { Panel } from "./Panel";
import { store } from "./redux/store";

export function App() {
  return (
    <Provider store={store}>
      <Panel />
      <Map />
    </Provider>
  );
}
