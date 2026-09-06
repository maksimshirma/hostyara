import { createApp, App as VueApp } from "vue";
import { AppModule } from "@hostyara/contracts";
import { App } from "./App";

const apps = new WeakMap<HTMLElement, VueApp>();

const appModule: AppModule = {
  mount(el) {
    const app = createApp(App);
    app.mount(el);
    apps.set(el, app);
  },
  unmount(el) {
    const app = apps.get(el);
    if (app) {
      app.unmount();
      apps.delete(el);
    }
  },
};

export default appModule;
