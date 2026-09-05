import styles from "./App.module.css";

export function App() {
  return (
    <div className={styles.card}>
      <h2 className={styles.title}>Рецепты</h2>
      <p className={styles.text}>
        Демо-приложение на React, загруженное как удалённый модуль Module Federation.
      </p>
    </div>
  );
}
