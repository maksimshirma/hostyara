import { hasErrors, validateSignIn, validateSignUp } from "../validateCredentials";

describe("validateSignIn", () => {
  it("accepts a well-formed email and any non-empty password", () => {
    expect(validateSignIn({ email: "anna@example.com", password: "x" })).toEqual({});
  });

  it("asks for both fields when empty", () => {
    expect(validateSignIn({ email: "", password: "" })).toEqual({
      email: "Введите почту",
      password: "Введите пароль",
    });
  });

  it("rejects an email without a domain", () => {
    expect(validateSignIn({ email: "anna@", password: "x" }).email).toBe(
      "Почта в формате name@example.com",
    );
  });

  it("tolerates surrounding whitespace in the email", () => {
    expect(validateSignIn({ email: "  anna@example.com ", password: "x" })).toEqual({});
  });
});

describe("validateSignUp", () => {
  const valid = { name: "Анна", email: "anna@example.com", password: "correct-horse" };

  it("accepts a complete form", () => {
    expect(hasErrors(validateSignUp(valid))).toBe(false);
  });

  it("requires a non-blank name", () => {
    expect(validateSignUp({ ...valid, name: "  " }).name).toBe("Введите имя");
  });

  it("requires at least 8 characters of password", () => {
    expect(validateSignUp({ ...valid, password: "1234567" }).password).toBe(
      "Пароль должен быть не короче 8 символов",
    );
    expect(validateSignUp({ ...valid, password: "12345678" }).password).toBeUndefined();
  });
});
