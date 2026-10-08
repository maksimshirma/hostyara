import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { RouterLink } from "../../components/RouterLink";
import { AuthFailure } from "../../session/sessionApi";
import { AuthLayout } from "./AuthLayout";
import { AuthForm, FailureAlert, FormField, readField, useSubmit } from "./authForm";
import { CredentialsErrors, hasErrors, validateSignIn } from "./validateCredentials";

export interface SignInPageProps {
  // Почему человек снова на входе (например, сессия истекла).
  notice: string | null;
  signUpHref: string;
  onLogin(email: string, password: string): Promise<AuthFailure | null>;
}

export function SignInPage({ notice, signUpHref, onLogin }: SignInPageProps) {
  const [errors, setErrors] = useState<CredentialsErrors>({});
  const { pending, failure, submit } = useSubmit(onLogin);

  function handleSubmit(form: HTMLFormElement) {
    const input = { email: readField(form, "email"), password: readField(form, "password") };
    const nextErrors = validateSignIn(input);
    setErrors(nextErrors);
    if (!hasErrors(nextErrors)) void submit(input.email.trim(), input.password);
  }

  return (
    <AuthLayout title="Вход">
      {notice && <Alert severity="info">{notice}</Alert>}
      <AuthForm onSubmit={handleSubmit}>
        <FormField
          name="email"
          label="Почта"
          type="email"
          placeholder="name@example.com"
          autoComplete="email"
          autoFocus
          required
          error={errors.email}
        />
        <FormField
          name="password"
          label="Пароль"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
          error={errors.password}
        />
        <FailureAlert failure={failure} />
        <Button type="submit" fullWidth variant="contained" loading={pending}>
          Войти
        </Button>
      </AuthForm>
      <Typography sx={{ textAlign: "center" }}>
        Нет аккаунта?{" "}
        <RouterLink href={signUpHref} variant="body2">
          Зарегистрироваться
        </RouterLink>
      </Typography>
    </AuthLayout>
  );
}
