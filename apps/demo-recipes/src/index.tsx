import { createRoot, Root } from "react-dom/client";
import { AppModule } from "@hostyara/contracts";
import { SdkHistoryRouter } from "@hostyara/router-react";
import { App } from "./App";

const roots = new WeakMap<HTMLElement, Root>();

const appModule: AppModule = {
  mount(el, sdk) {
    const root = createRoot(el);
    root.render(
      <SdkHistoryRouter sdk={sdk}>
        <App />
      </SdkHistoryRouter>,
    );
    roots.set(el, root);
  },
  unmount(el) {
    const root = roots.get(el);
    if (root) {
      root.unmount();
      roots.delete(el);
    }
  },
};

export default appModule;
