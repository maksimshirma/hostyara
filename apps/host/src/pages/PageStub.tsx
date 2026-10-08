import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

// Пустая страница раздела, у которого пока есть только адрес.
export function PageStub({ title }: { title: string }) {
  return (
    <Stack spacing={1} sx={{ py: 2 }}>
      <Typography component="h1" variant="h4">
        {title}
      </Typography>
      <Typography sx={{ color: "text.secondary" }}>Раздел в разработке</Typography>
    </Stack>
  );
}
