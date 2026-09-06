import { Route, Routes } from "react-router-dom";
import { RecipeDetailScreen } from "./screens/RecipeDetailScreen";
import { RecipeListScreen } from "./screens/RecipeListScreen";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<RecipeListScreen />} />
      <Route path="/r/:id" element={<RecipeDetailScreen />} />
    </Routes>
  );
}
