import { createRoot, Root } from "react-dom/client";
import { AppModule } from "@hostyara/contracts";
import { App } from "./App";

const roots = new WeakMap<HTMLElement, Root>();

const appModule: AppModule = {
  mount(el) {
    const root = createRoot(el);
    root.render(<App />);
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
