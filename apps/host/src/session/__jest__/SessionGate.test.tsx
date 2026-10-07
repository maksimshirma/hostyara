import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@module-federation/runtime", () => ({
  init: jest.fn(),
  registerRemotes: jest.fn(),
  loadRemote: jest.fn(() => new Promise(() => {})),
}));

import { SessionGate } from "../SessionGate";

type Route = (method: string, body: unknown) => { status: number; body?: unknown };

const USER = { id: "u1", name: "Анна", email: "anna@example.com" };
const ACCESS = {
  role: "owner",
  installedApps: ["recipes"],
  grants: { recipes: "edit" },
  permissions: {},
};

// Minimal fetch Response stand-in — jsdom has neither Response nor Headers.
function fakeResponse(status: number, body?: unknown) {
  const text = body === undefined ? "" : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => (name.toLowerCase() === "content-type" ? "application/json" : null),
    },
    text: async () => text,
  };
}

function setup(routes: Record<string, Route>) {
  const calls: Array<{ method: string; path: string; body: unknown }> = [];
  const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, path, body });
    const route = routes[`${method} ${path}`] ?? routes[path];
    const result = route ? route(method, body) : { status: 404, body: { error: "not_found" } };
    return fakeResponse(result.status, result.body) as unknown as Response;
  });
  const createEventSource = () => ({
    readyState: 1,
    onerror: null,
    addEventListener: () => {},
    close: () => {},
  });
  render(
    <SessionGate
      fetch={fetchMock as unknown as typeof fetch}
      createEventSource={createEventSource}
    />,
  );
  return { calls };
}

const signedOut = { "/auth/me": () => ({ status: 401, body: { error: "unauthenticated" } }) };
const households = {
  "/identity/api/auth/organization/list": () => ({
    status: 200,
    body: [{ id: "demo", name: "Семья Ивановых" }],
  }),
  "/api/h/demo/access": () => ({ status: 200, body: ACCESS }),
};

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  jest.spyOn(window, "scrollTo").mockImplementation(() => {});
});

async function fillLogin(email = USER.email, password = "correct-horse") {
  await userEvent.type(await screen.findByLabelText("Почта"), email);
  await userEvent.type(screen.getByLabelText("Пароль"), password);
  await userEvent.click(screen.getByRole("button", { name: "Войти" }));
}

describe("SessionGate", () => {
  it("opens the shell straight away for an existing session", async () => {
    setup({
      "/auth/me": () => ({ status: 200, body: { userId: "u1", user: USER } }),
      ...households,
    });

    expect(await screen.findByRole("link", { name: "Рецепты" })).toBeInTheDocument();
    expect(screen.getByText("Анна")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/h/demo-semya-ivanovyh");
  });

  it("logs in and lands in the first household", async () => {
    const { calls } = setup({
      ...signedOut,
      "POST /auth/login": () => ({ status: 200, body: { user: USER } }),
      ...households,
    });

    await fillLogin();

    expect(await screen.findByRole("link", { name: "Рецепты" })).toBeInTheDocument();
    expect(calls).toContainEqual({
      method: "POST",
      path: "/auth/login",
      body: { email: USER.email, password: "correct-horse" },
    });
  });

  it("shows a wrong password without leaving the login screen", async () => {
    setup({
      ...signedOut,
      "POST /auth/login": () => ({ status: 401, body: { error: "invalid_credentials" } }),
    });

    await fillLogin(USER.email, "wrong-password");

    expect(await screen.findByRole("alert")).toHaveTextContent("Неверная почта или пароль");
    expect(screen.getByRole("heading", { name: "Вход" })).toBeInTheDocument();
  });

  it("asks for the TOTP code when the account has 2FA", async () => {
    let attempts = 0;
    setup({
      ...signedOut,
      "POST /auth/login": () => ({ status: 200, body: { twoFactor: true } }),
      "POST /auth/2fa/verify": () =>
        ++attempts === 1
          ? { status: 401, body: { error: "invalid_code" } }
          : { status: 200, body: { user: USER } },
      ...households,
    });

    await fillLogin();
    await userEvent.type(
      await screen.findByLabelText("Код из приложения-аутентификатора"),
      "000000",
    );
    await userEvent.click(screen.getByRole("button", { name: "Подтвердить" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Неверный код");

    await userEvent.clear(screen.getByLabelText("Код из приложения-аутентификатора"));
    await userEvent.type(screen.getByLabelText("Код из приложения-аутентификатора"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Подтвердить" }));

    expect(await screen.findByRole("link", { name: "Рецепты" })).toBeInTheDocument();
  });

  it("signs up and asks to create a first household", async () => {
    let created = false;
    const { calls } = setup({
      ...signedOut,
      "POST /auth/signup": () => ({ status: 200, body: { user: USER } }),
      "/identity/api/auth/organization/list": () => ({ status: 200, body: [] }),
      "POST /identity/api/auth/organization/create": () => {
        created = true;
        return { status: 200, body: { id: "h42", name: "Дом" } };
      },
      "/api/h/h42/access": () => ({ status: 200, body: ACCESS }),
    });

    await userEvent.click(
      await screen.findByRole("button", { name: "Нет аккаунта? Зарегистрироваться" }),
    );
    await userEvent.type(screen.getByLabelText("Имя"), "Анна");
    await userEvent.type(screen.getByLabelText("Почта"), USER.email);
    await userEvent.type(screen.getByLabelText("Пароль"), "correct-horse");
    await userEvent.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

    await userEvent.type(await screen.findByLabelText("Название"), "Дом");
    await userEvent.click(screen.getByRole("button", { name: "Создать" }));

    expect(await screen.findByRole("link", { name: "Рецепты" })).toBeInTheDocument();
    expect(created).toBe(true);
    const createCall = calls.find((call) => call.path === "/identity/api/auth/organization/create");
    expect(createCall?.body).toMatchObject({
      name: "Дом",
      slug: expect.stringMatching(/^dom-[a-z0-9]+$/),
    });
  });

  it("returns to the login screen when the BFF reports the session gone, keeping the URL", async () => {
    // The session expires between /auth/me and the first access check.
    window.history.replaceState(null, "", "/h/demo-semya-ivanovyh/a/recipes");
    setup({
      "/auth/me": () => ({ status: 200, body: { userId: "u1", user: USER } }),
      "/identity/api/auth/organization/list": () => ({
        status: 200,
        body: [{ id: "demo", name: "Семья Ивановых" }],
      }),
      "/api/h/demo/access": () => ({ status: 401, body: { error: "unauthenticated" } }),
    });

    expect(await screen.findByText("Сессия завершена — войдите снова")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/h/demo-semya-ivanovyh/a/recipes");
  });

  it("logs out through the BFF", async () => {
    const { calls } = setup({
      "/auth/me": () => ({ status: 200, body: { userId: "u1", user: USER } }),
      "POST /auth/logout": () => ({ status: 200, body: { ok: true } }),
      ...households,
    });

    await userEvent.click(await screen.findByRole("button", { name: "Выйти" }));

    expect(await screen.findByRole("heading", { name: "Вход" })).toBeInTheDocument();
    expect(calls.some((call) => call.method === "POST" && call.path === "/auth/logout")).toBe(true);
  });

  it("offers a retry when the BFF is unreachable", async () => {
    let up = false;
    setup({
      "/auth/me": () =>
        up
          ? { status: 401, body: { error: "unauthenticated" } }
          : { status: 502, body: { error: "upstream_unavailable" } },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("Сервис недоступен");
    up = true;
    await userEvent.click(screen.getByRole("button", { name: "Повторить" }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "Вход" })).toBeInTheDocument());
  });
});
