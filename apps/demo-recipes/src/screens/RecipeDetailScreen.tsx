import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import styles from "../App.module.css";
import { useSdk } from "../sdkContext";

export function RecipeDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const sdk = useSdk();
  const title = `Рецепт №${id}`;

  // The shell already shows "household / Рецепты"; the app adds its own tail.
  useEffect(() => {
    sdk.nav.setBreadcrumbs([{ label: title }]);
    sdk.nav.setTitle(title);
  }, [sdk, title]);

  return (
    <div className={styles.card}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.text}>Демо-экран рецепта, загруженный через SDK-роутинг.</p>
      <Link to="/">Назад к списку</Link>
    </div>
  );
}
