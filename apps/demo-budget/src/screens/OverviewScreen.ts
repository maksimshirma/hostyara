import { defineComponent, h } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import styles from "../App.module.css";

interface Transaction {
  id: string;
  title: string;
  category: string;
}

const TRANSACTIONS: Transaction[] = [
  { id: "1", title: "Продукты", category: "еда" },
  { id: "2", title: "Аренда", category: "жильё" },
  { id: "3", title: "Кафе", category: "еда" },
];

const CATEGORIES = ["", "еда", "жильё"];

export const OverviewScreen = defineComponent({
  name: "OverviewScreen",
  setup() {
    const router = useRouter();
    const route = useRoute();

    function setCategory(value: string): void {
      // Filtering is a view of the same list, not a new place — replace so
      // it doesn't pile up in history (T13).
      router.replace({ query: value ? { category: value } : {} });
    }

    return () => {
      const category = (route.query.category as string | undefined) ?? "";
      const transactions = category
        ? TRANSACTIONS.filter((transaction) => transaction.category === category)
        : TRANSACTIONS;

      return h("div", { class: styles.card }, [
        h("h2", { class: styles.title }, "Бюджет"),
        h(
          "div",
          { role: "group", "aria-label": "Фильтр по категории" },
          CATEGORIES.map((option) =>
            h(
              "button",
              {
                key: option || "all",
                type: "button",
                "aria-pressed": category === option,
                onClick: () => setCategory(option),
              },
              option || "все",
            ),
          ),
        ),
        h(
          "ul",
          {},
          transactions.map((transaction) =>
            h("li", { key: transaction.id }, [
              h(RouterLink, { to: `/tx/${transaction.id}` }, () => transaction.title),
            ]),
          ),
        ),
      ]);
    };
  },
});
