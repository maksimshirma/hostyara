import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { RouterButton } from "../components/RouterLink";

export function NotFoundPage() {
  return (
    <Stack spacing={2} sx={{ py: 2, alignItems: "flex-start" }}>
      <Typography component="h1" variant="h4">
        Страница не найдена
      </Typography>
      <Typography sx={{ color: "text.secondary" }}>
        Адрес неверный или страница больше не существует.
      </Typography>
      <RouterButton variant="outlined" to="/">
        На главную
      </RouterButton>
    </Stack>
  );
}
