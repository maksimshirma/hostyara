import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import styles from "../App.module.css";
import { BackendCheck } from "../BackendCheck";
import { useSdk } from "../sdkContext";

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
  const sdk = useSdk();
  const [searchParams, setSearchParams] = useSearchParams();
  const tag = searchParams.get("tag") ?? "";
  const recipes = tag ? RECIPES.filter((recipe) => recipe.tag === tag) : RECIPES;

  // The app's root: nothing to add after the shell's "household / Рецепты".
  useEffect(() => {
    sdk.nav.setBreadcrumbs([]);
    sdk.nav.setTitle("Рецепты");
  }, [sdk]);

  return (
    <div className={styles.card}>
      <h2 className={styles.title}>Рецепты</h2>
      <BackendCheck />
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
