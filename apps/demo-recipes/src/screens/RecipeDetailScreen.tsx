import { Link, useParams } from "react-router-dom";
import styles from "../App.module.css";

export function RecipeDetailScreen() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className={styles.card}>
      <h2 className={styles.title}>Рецепт №{id}</h2>
      <p className={styles.text}>Демо-экран рецепта, загруженный через SDK-роутинг.</p>
      <Link to="/">Назад к списку</Link>
    </div>
  );
}
