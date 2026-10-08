import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShellRouter } from "../../../testing/ShellRouter";
import { AuthFailure } from "../../../session/sessionApi";
import { SignInPage } from "../SignInPage";

type OnLogin = (email: string, password: string) => Promise<AuthFailure | null>;

function renderSignIn(
  onLogin = jest.fn<ReturnType<OnLogin>, Parameters<OnLogin>>(async () => null),
  notice: string | null = null,
) {
  render(<SignInPage notice={notice} signUpHref="/signup?_from=%2Fh%2Fx" onLogin={onLogin} />, {
    wrapper: ShellRouter,
  });
  return onLogin;
}

beforeEach(() => {
  window.history.replaceState(null, "", "/login?_from=%2Fh%2Fx");
});

describe("SignInPage", () => {
  it("submits trimmed credentials", async () => {
    const onLogin = renderSignIn();

    await userEvent.type(screen.getByLabelText("Почта"), " anna@example.com ");
    await userEvent.type(screen.getByLabelText("Пароль"), "secret");
    await userEvent.click(screen.getByRole("button", { name: "Войти" }));

    expect(onLogin).toHaveBeenCalledWith("anna@example.com", "secret");
  });

  it("highlights invalid fields without calling the BFF", async () => {
    const onLogin = renderSignIn();

    await userEvent.type(screen.getByLabelText("Почта"), "anna");
    await userEvent.click(screen.getByRole("button", { name: "Войти" }));

    expect(screen.getByText("Почта в формате name@example.com")).toBeInTheDocument();
    expect(screen.getByText("Введите пароль")).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
  });

  it("shows the BFF's refusal as an alert", async () => {
    renderSignIn(
      jest.fn<ReturnType<OnLogin>, Parameters<OnLogin>>(async () => "invalid_credentials"),
    );

    await userEvent.type(screen.getByLabelText("Почта"), "anna@example.com");
    await userEvent.type(screen.getByLabelText("Пароль"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Войти" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Неверная почта или пароль");
  });

  it("shows why the person is back on the login screen", () => {
    renderSignIn(undefined, "Сессия завершена — войдите снова");

    expect(screen.getByText("Сессия завершена — войдите снова")).toBeInTheDocument();
  });

  it("links to sign-up as a real anchor that navigates without a reload", async () => {
    renderSignIn();
    const link = screen.getByRole("link", { name: "Зарегистрироваться" });

    expect(link).toHaveAttribute("href", "/signup?_from=%2Fh%2Fx");
    await userEvent.click(link);
    expect(`${window.location.pathname}${window.location.search}`).toBe("/signup?_from=%2Fh%2Fx");
  });
});
