import { Route } from "../router";
import { NotFoundPage } from "./NotFoundPage";
import { PageStub } from "./PageStub";
import { shellPageTitle } from "./shellPages";

// Страница shell для маршрута — единственная точка «маршрут → страница».
export function ShellPage({ route }: { route: Route }) {
  if (route.kind === "not-found") return <NotFoundPage />;
  const title = shellPageTitle(route);
  return title ? <PageStub title={title} /> : null;
}
