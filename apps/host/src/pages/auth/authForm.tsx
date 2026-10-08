import { FormEvent, ReactNode, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import TextField, { TextFieldProps } from "@mui/material/TextField";
import { AuthFailure } from "../../session/sessionApi";

export const FAILURE_TEXT: Record<AuthFailure, string> = {
  invalid_credentials: "Неверная почта или пароль",
  invalid_code: "Неверный код",
  already_registered: "Аккаунт с этой почтой уже существует",
  weak_password: "Пароль должен быть не короче 8 символов",
  expired: "Время на ввод кода истекло — войдите снова",
  unavailable: "Сервис недоступен, попробуйте позже",
};

export function FailureAlert({ failure }: { failure: AuthFailure | null }) {
  return failure ? <Alert severity="error">{FAILURE_TEXT[failure]}</Alert> : null;
}

// Блокирует отправку, пока действие идёт, и показывает его отказ.
export function useSubmit<T extends unknown[]>(
  action: (...args: T) => Promise<AuthFailure | null>,
) {
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

export function readField(form: HTMLFormElement, name: string): string {
  return (form.elements.namedItem(name) as HTMLInputElement).value;
}

export type FormFieldProps = Omit<TextFieldProps, "error" | "helperText" | "id" | "name"> & {
  name: string;
  label: string;
  error?: string;
  // Подсказка под полем, пока нет ошибки.
  hint?: string;
};

// Подпись над полем (FormLabel), как в шаблонах MUI; ошибка — под полем.
export function FormField({ name, label, error, hint, ...rest }: FormFieldProps) {
  const id = `auth-${name}`;
  return (
    <FormControl>
      <FormLabel htmlFor={id}>{label}</FormLabel>
      <TextField
        id={id}
        name={name}
        error={Boolean(error)}
        helperText={error ?? hint}
        fullWidth
        variant="outlined"
        {...rest}
      />
    </FormControl>
  );
}

export function AuthForm({
  onSubmit,
  children,
}: {
  onSubmit(form: HTMLFormElement): void;
  children: ReactNode;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(event.currentTarget);
  }
  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      sx={{ display: "flex", flexDirection: "column", width: "100%", gap: 2 }}
    >
      {children}
    </Box>
  );
}
