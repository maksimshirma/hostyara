export interface CredentialsInput {
  name?: string;
  email: string;
  password: string;
}

export type CredentialsErrors = Partial<Record<keyof CredentialsInput, string>>;

// Сервер проверяет то же самое; здесь — только чтобы не гонять запрос
// с заведомо неверными данными и подсветить конкретное поле.
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
export const MIN_PASSWORD_LENGTH = 8;

function validateEmail(email: string): string | undefined {
  if (!email.trim()) return "Введите почту";
  if (!EMAIL_PATTERN.test(email.trim())) return "Почта в формате name@example.com";
  return undefined;
}

function withoutEmpty(errors: CredentialsErrors): CredentialsErrors {
  return Object.fromEntries(
    Object.entries(errors).filter(([, message]) => message !== undefined),
  ) as CredentialsErrors;
}

export function validateSignIn({ email, password }: CredentialsInput): CredentialsErrors {
  return withoutEmpty({
    email: validateEmail(email),
    password: password ? undefined : "Введите пароль",
  });
}

export function validateSignUp({
  name = "",
  email,
  password,
}: CredentialsInput): CredentialsErrors {
  return withoutEmpty({
    name: name.trim() ? undefined : "Введите имя",
    email: validateEmail(email),
    password:
      password.length >= MIN_PASSWORD_LENGTH
        ? undefined
        : `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`,
  });
}

export function hasErrors(errors: CredentialsErrors): boolean {
  return Object.keys(errors).length > 0;
}
