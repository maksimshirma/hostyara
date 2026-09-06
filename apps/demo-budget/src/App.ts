import { defineComponent, h } from "vue";
import styles from "./App.module.css";

export const App = defineComponent({
  name: "BudgetApp",
  setup() {
    return () =>
      h("div", { class: styles.card }, [
        h("h2", { class: styles.title }, "Бюджет"),
        h(
          "p",
          { class: styles.text },
          "Демо-приложение на Vue, загруженное как удалённый модуль Module Federation.",
        ),
      ]);
  },
});
