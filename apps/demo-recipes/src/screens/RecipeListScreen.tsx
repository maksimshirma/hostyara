import { Link, useSearchParams } from "react-router-dom";
import styles from "../App.module.css";

interface Recipe {
  id: string;
  title: string;
  tag: string;
}

const RECIPES: Recipe[] = [
  { id: "8421", title: "Паста карбонара", tag: "ужин" },
  { id: "8422", title: "Борщ", tag: "обед" },
  { id: "8423", title: "Омлет", tag: "завтрак" },
];

const TAGS = ["", "завтрак", "обед", "ужин"];

export function RecipeListScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tag = searchParams.get("tag") ?? "";
  const recipes = tag ? RECIPES.filter((recipe) => recipe.tag === tag) : RECIPES;

  return (
    <div className={styles.card}>
      <h2 className={styles.title}>Рецепты</h2>
      <div role="group" aria-label="Фильтр по тегу">
        {TAGS.map((option) => (
          <button
            key={option || "all"}
            type="button"
            aria-pressed={tag === option}
            onClick={() => setSearchParams(option ? { tag: option } : {}, { replace: true })}
          >
            {option || "все"}
          </button>
        ))}
      </div>
      <ul>
        {recipes.map((recipe) => (
          <li key={recipe.id}>
            <Link to={`/r/${recipe.id}`}>{recipe.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
