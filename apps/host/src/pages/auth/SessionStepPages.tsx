import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { AuthFailure } from "../../session/sessionApi";
import { AuthLayout } from "./AuthLayout";
import { AuthForm, FAILURE_TEXT, FailureAlert, FormField, readField, useSubmit } from "./authForm";

// Шаги сессии без собственного адреса: человек остаётся на исходном URL.

export interface TwoFactorPageProps {
  onVerify(code: string): Promise<AuthFailure | null>;
  onCancel(): void;
}

export function TwoFactorPage({ onVerify, onCancel }: TwoFactorPageProps) {
  const { pending, failure, submit } = useSubmit(onVerify);

  return (
    <AuthLayout title="Подтверждение входа">
      <AuthForm onSubmit={(form) => void submit(readField(form, "code"))}>
        <FormField
          name="code"
          label="Код из приложения-аутентификатора"
          autoComplete="one-time-code"
          autoFocus
          required
          slotProps={{ htmlInput: { inputMode: "numeric" } }}
        />
        <FailureAlert failure={failure} />
        <Button type="submit" fullWidth variant="contained" loading={pending}>
          Подтвердить
        </Button>
      </AuthForm>
      <Button variant="text" onClick={onCancel}>
        Войти заново
      </Button>
    </AuthLayout>
  );
}

export interface CreateHouseholdPageProps {
  onCreate(name: string): Promise<AuthFailure | null>;
}

export function CreateHouseholdPage({ onCreate }: CreateHouseholdPageProps) {
  const { pending, failure, submit } = useSubmit(onCreate);

  return (
    <AuthLayout title="Создайте пространство">
      <Typography sx={{ color: "text.secondary" }}>
        Пространство объединяет семью: участников, приложения и общие данные.
      </Typography>
      <AuthForm onSubmit={(form) => void submit(readField(form, "name"))}>
        <FormField name="name" label="Название" placeholder="Семья Ивановых" autoFocus required />
        <FailureAlert failure={failure} />
        <Button type="submit" fullWidth variant="contained" loading={pending}>
          Создать
        </Button>
      </AuthForm>
    </AuthLayout>
  );
}

export function UnavailablePage({ onRetry }: { onRetry(): void }) {
  return (
    <AuthLayout title="Хостяра недоступна">
      <Alert severity="error">{FAILURE_TEXT.unavailable}</Alert>
      <Button variant="contained" onClick={onRetry}>
        Повторить
      </Button>
    </AuthLayout>
  );
}
