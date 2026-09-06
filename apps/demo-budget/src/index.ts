import { createApp, App as VueApp } from "vue";
import { createRouter } from "vue-router";
import { AppModule } from "@hostyara/contracts";
import { createVueRouterHistory } from "@hostyara/router-vue";
import { App } from "./App";
import { OverviewScreen } from "./screens/OverviewScreen";
import { TransactionScreen } from "./screens/TransactionScreen";

const apps = new WeakMap<HTMLElement, VueApp>();

const appModule: AppModule = {
  mount(el, sdk) {
    const router = createRouter({
      history: createVueRouterHistory(sdk),
      routes: [
        { path: "/", component: OverviewScreen },
        { path: "/tx/:id", component: TransactionScreen },
      ],
    });

    const app = createApp(App);
    app.use(router);
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
