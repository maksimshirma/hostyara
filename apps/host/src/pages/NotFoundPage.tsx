import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { paths, useRouterLinkClick } from "../router";

export function NotFoundPage() {
  const goHome = useRouterLinkClick(paths.root());
  return (
    <Stack spacing={2} sx={{ py: 2, alignItems: "flex-start" }}>
      <Typography component="h1" variant="h4">
        Страница не найдена
      </Typography>
      <Typography sx={{ color: "text.secondary" }}>
        Адрес неверный или страница больше не существует.
      </Typography>
      <Button variant="outlined" href={paths.root()} onClick={goHome}>
        На главную
      </Button>
    </Stack>
  );
}
