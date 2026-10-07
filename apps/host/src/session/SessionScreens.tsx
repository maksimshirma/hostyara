import { FormEvent, useState } from "react";
import { AuthFailure } from "./sessionApi";
import styles from "./SessionScreens.module.css";

const FAILURE_TEXT: Record<AuthFailure, string> = {
  invalid_credentials: "Неверная почта или пароль",
  invalid_code: "Неверный код",
  already_registered: "Аккаунт с этой почтой уже существует",
  weak_password: "Пароль должен быть не короче 8 символов",
  expired: "Время на ввод кода истекло — войдите снова",
  unavailable: "Сервис недоступен, попробуйте позже",
};

function FailureMessage({ failure }: { failure: AuthFailure | null }) {
  return failure ? (
    <p role="alert" className={styles.error}>
      {FAILURE_TEXT[failure]}
    </p>
  ) : null;
}

// Disables the submit button while the action runs and shows its failure.
function useSubmit<T extends unknown[]>(action: (...args: T) => Promise<AuthFailure | null>) {
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<AuthFailure | null>(null);
  async function submit(...args: T) {
    setPending(true);
    setFailure(null);
    const result = await action(...args);
    setPending(false);
    setFailure(result);
  }
  return { pending, failure, submit };
}

function field(form: HTMLFormElement, name: string): string {
  return (form.elements.namedItem(name) as HTMLInputElement).value;
}

export interface CredentialsScreenProps {
  onLogin(email: string, password: string): Promise<AuthFailure | null>;
  onSignUp(name: string, email: string, password: string): Promise<AuthFailure | null>;
  notice: string | null;
}

export function CredentialsScreen({ onLogin, onSignUp, notice }: CredentialsScreenProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const { pending, failure, submit } = useSubmit((form: HTMLFormElement) =>
    mode === "login"
      ? onLogin(field(form, "email"), field(form, "password"))
      : onSignUp(field(form, "name"), field(form, "email"), field(form, "password")),
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(event.currentTarget);
  }

  return (
    <section className={styles.screen}>
      <h2>{mode === "login" ? "Вход" : "Регистрация"}</h2>
      {notice && <p>{notice}</p>}
      <form className={styles.form} onSubmit={handleSubmit}>
        {mode === "signup" && (
          <label className={styles.field}>
            Имя
            <input name="name" required autoComplete="name" />
          </label>
        )}
        <label className={styles.field}>
          Почта
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label className={styles.field}>
          Пароль
          <input
            name="password"
            type="password"
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </label>
        <FailureMessage failure={failure} />
        <button type="submit" disabled={pending}>
          {mode === "login" ? "Войти" : "Зарегистрироваться"}
        </button>
      </form>
      <button
        type="button"
        className={styles.switch}
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
      >
        {mode === "login" ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
      </button>
    </section>
  );
}

export interface TwoFactorScreenProps {
  onVerify(code: string): Promise<AuthFailure | null>;
  onCancel(): void;
}

export function TwoFactorScreen({ onVerify, onCancel }: TwoFactorScreenProps) {
  const { pending, failure, submit } = useSubmit((code: string) => onVerify(code));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(field(event.currentTarget, "code"));
  }

  return (
    <section className={styles.screen}>
      <h2>Подтверждение входа</h2>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          Код из приложения-аутентификатора
          <input name="code" inputMode="numeric" autoComplete="one-time-code" required />
        </label>
        <FailureMessage failure={failure} />
        <button type="submit" disabled={pending}>
          Подтвердить
        </button>
      </form>
      <button type="button" className={styles.switch} onClick={onCancel}>
        Войти заново
      </button>
    </section>
  );
}

export interface CreateHouseholdScreenProps {
  onCreate(name: string): Promise<AuthFailure | null>;
}

export function CreateHouseholdScreen({ onCreate }: CreateHouseholdScreenProps) {
  const { pending, failure, submit } = useSubmit((name: string) => onCreate(name));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(field(event.currentTarget, "name"));
  }

  return (
    <section className={styles.screen}>
      <h2>Создайте пространство</h2>
      <p>Пространство объединяет семью: участников, приложения и общие данные.</p>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          Название
          <input name="name" required placeholder="Семья Ивановых" />
        </label>
        <FailureMessage failure={failure} />
        <button type="submit" disabled={pending}>
          Создать
        </button>
      </form>
    </section>
  );
}

export function UnavailableScreen({ onRetry }: { onRetry(): void }) {
  return (
    <section className={styles.screen}>
      <p role="alert">{FAILURE_TEXT.unavailable}</p>
      <button type="button" onClick={onRetry}>
        Повторить
      </button>
    </section>
  );
}
