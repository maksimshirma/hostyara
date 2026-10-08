import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShellRouter } from "../../../testing/ShellRouter";
import { AuthFailure } from "../../../session/sessionApi";
import { SignUpPage } from "../SignUpPage";

type OnSignUp = (name: string, email: string, password: string) => Promise<AuthFailure | null>;

function renderSignUp(
  onSignUp = jest.fn<ReturnType<OnSignUp>, Parameters<OnSignUp>>(async () => null),
) {
  render(<SignUpPage returnAddress="/h/x" onSignUp={onSignUp} />, {
    wrapper: ShellRouter,
  });
  return onSignUp;
}

async function fill(name: string, email: string, password: string) {
  if (name) await userEvent.type(screen.getByLabelText("Имя"), name);
  if (email) await userEvent.type(screen.getByLabelText("Почта"), email);
  if (password) await userEvent.type(screen.getByLabelText("Пароль"), password);
  await userEvent.click(screen.getByRole("button", { name: "Зарегистрироваться" }));
}

beforeEach(() => {
  window.history.replaceState(null, "", "/signup?_from=%2Fh%2Fx");
});

describe("SignUpPage", () => {
  it("submits a valid form with trimmed name and email", async () => {
    const onSignUp = renderSignUp();

    await fill(" Анна ", "anna@example.com ", "correct-horse");

    expect(onSignUp).toHaveBeenCalledWith("Анна", "anna@example.com", "correct-horse");
  });

  it("explains a short password instead of calling the BFF", async () => {
    const onSignUp = renderSignUp();

    await fill("Анна", "anna@example.com", "short");

    expect(screen.getByText("Пароль должен быть не короче 8 символов")).toBeInTheDocument();
    expect(onSignUp).not.toHaveBeenCalled();
  });

  it("shows the BFF's refusal as an alert", async () => {
    renderSignUp(
      jest.fn<ReturnType<OnSignUp>, Parameters<OnSignUp>>(async () => "already_registered"),
    );

    await fill("Анна", "anna@example.com", "correct-horse");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Аккаунт с этой почтой уже существует",
    );
  });

  it("links back to sign-in keeping the return address", async () => {
    renderSignUp();

    await userEvent.click(screen.getByRole("link", { name: "Войти" }));

    expect(`${window.location.pathname}${window.location.search}`).toBe("/login?_from=%2Fh%2Fx");
  });
});
