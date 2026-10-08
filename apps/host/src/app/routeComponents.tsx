import { Outlet, useRouterState } from "@tanstack/react-router";
import { AppSlot } from "../chrome/AppSlot";
import { HostChrome } from "../chrome/HostChrome";
import { SignInPage } from "../pages/auth/SignInPage";
import { SignUpPage } from "../pages/auth/SignUpPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { PageStub } from "../pages/PageStub";
import { PublicLayout } from "../pages/PublicLayout";
import { shellPageTitle } from "../pages/shellPages";
import { FROM_PARAM, useRoute } from "../router";
import {
  appMountRoute,
  loginRoute,
  publicLayout,
  rootRoute,
  shellLayout,
  signupRoute,
  spaceRoute,
  stubRoutes,
} from "../router/routes";
import { OUTLET, useGateScreen, useSession } from "../session/SessionContext";

const SESSION_ENDED_NOTICE = "Сессия завершена — войдите снова";

function RootScreen() {
  const gate = useGateScreen();
  return gate === OUTLET ? <Outlet /> : <>{gate}</>;
}

// Вход и регистрация передают друг другу исходный адрес.
function useReturnAddress(): string | undefined {
  const searchStr = useRouterState({ select: (state) => state.location.searchStr });
  return new URLSearchParams(searchStr).get(FROM_PARAM) ?? undefined;
}

function LoginScreen() {
  const { state, login } = useSession();
  const from = useReturnAddress();
  const expired = state.kind === "signed-out" && state.reason === "expired";
  return (
    <SignInPage
      notice={expired ? SESSION_ENDED_NOTICE : null}
      returnAddress={from}
      onLogin={login}
    />
  );
}

function SignUpScreen() {
  const { signUp } = useSession();
  const from = useReturnAddress();
  return <SignUpPage returnAddress={from} onSignUp={signUp} />;
}

// Публичная зона (IA §5): минимальный хром, CTA на регистрацию для гостя.
function PublicScreen() {
  const { state } = useSession();
  return (
    <PublicLayout showSignUp={state.kind !== "signed-in"}>
      <Outlet />
    </PublicLayout>
  );
}

function ShellScreen() {
  const { state, bff, accessTracker, logout } = useSession();
  // The root guard never lets a signed-out person reach the shell.
  if (state.kind !== "signed-in") return null;
  return (
    <HostChrome
      bff={bff}
      accessTracker={accessTracker}
      user={state.user}
      households={state.households}
      onLogout={logout}
    >
      <Outlet />
    </HostChrome>
  );
}

function StubScreen() {
  const title = shellPageTitle(useRoute());
  return title ? <PageStub title={title} /> : null;
}

// 404 вне пространства не относится ни к какому пространству — без меню.
function StandaloneNotFound() {
  return (
    <PublicLayout>
      <NotFoundPage />
    </PublicLayout>
  );
}

let attached = false;

// Route definitions (router/routes.ts) stay free of UI; the screens are
// attached here, once, before the app router is created.
export function attachRouteComponents(): void {
  if (attached) return;
  attached = true;
  rootRoute.update({ component: RootScreen, notFoundComponent: StandaloneNotFound });
  loginRoute.update({ component: LoginScreen });
  signupRoute.update({ component: SignUpScreen });
  publicLayout.update({ component: PublicScreen });
  shellLayout.update({ component: ShellScreen });
  spaceRoute.update({ notFoundComponent: NotFoundPage });
  appMountRoute.update({ component: AppSlot });
  for (const route of stubRoutes) route.update({ component: StubScreen });
}
