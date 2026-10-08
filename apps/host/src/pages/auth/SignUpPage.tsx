import { useState } from "react";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { RouterLink } from "../../components/RouterLink";
import { AuthFailure } from "../../session/sessionApi";
import { AuthLayout } from "./AuthLayout";
import { AuthForm, FailureAlert, FormField, readField, useSubmit } from "./authForm";
import {
  CredentialsErrors,
  hasErrors,
  MIN_PASSWORD_LENGTH,
  validateSignUp,
} from "./validateCredentials";

export interface SignUpPageProps {
  signInHref: string;
  onSignUp(name: string, email: string, password: string): Promise<AuthFailure | null>;
}

export function SignUpPage({ signInHref, onSignUp }: SignUpPageProps) {
  const [errors, setErrors] = useState<CredentialsErrors>({});
  const { pending, failure, submit } = useSubmit(onSignUp);

  function handleSubmit(form: HTMLFormElement) {
    const input = {
      name: readField(form, "name"),
      email: readField(form, "email"),
      password: readField(form, "password"),
    };
    const nextErrors = validateSignUp(input);
    setErrors(nextErrors);
    if (!hasErrors(nextErrors)) void submit(input.name.trim(), input.email.trim(), input.password);
  }

  return (
    <AuthLayout title="Регистрация">
      <AuthForm onSubmit={handleSubmit}>
        <FormField
          name="name"
          label="Имя"
          placeholder="Анна Иванова"
          autoComplete="name"
          autoFocus
          required
          error={errors.name}
        />
        <FormField
          name="email"
          label="Почта"
          type="email"
          placeholder="name@example.com"
          autoComplete="email"
          required
          error={errors.email}
        />
        <FormField
          name="password"
          label="Пароль"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          required
          error={errors.password}
          hint={`Не короче ${MIN_PASSWORD_LENGTH} символов`}
        />
        <FailureAlert failure={failure} />
        <Button type="submit" fullWidth variant="contained" loading={pending}>
          Зарегистрироваться
        </Button>
      </AuthForm>
      <Typography sx={{ textAlign: "center" }}>
        Уже есть аккаунт?{" "}
        <RouterLink href={signInHref} variant="body2">
          Войти
        </RouterLink>
      </Typography>
    </AuthLayout>
  );
}
