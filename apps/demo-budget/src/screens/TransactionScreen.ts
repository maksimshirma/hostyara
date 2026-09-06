import { defineComponent, h } from "vue";
import { RouterLink, useRoute } from "vue-router";
import styles from "../App.module.css";

export const TransactionScreen = defineComponent({
  name: "TransactionScreen",
  setup() {
    const route = useRoute();

    return () =>
      h("div", { class: styles.card }, [
        h("h2", { class: styles.title }, `Транзакция №${route.params.id}`),
        h("p", { class: styles.text }, "Демо-экран транзакции, загруженный через SDK-роутинг."),
        h(RouterLink, { to: "/" }, () => "Назад к списку"),
      ]);
  },
});
