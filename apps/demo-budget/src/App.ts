import { defineComponent, h } from "vue";
import { RouterView } from "vue-router";

export const App = defineComponent({
  name: "BudgetApp",
  setup() {
    return () => h(RouterView);
  },
});
