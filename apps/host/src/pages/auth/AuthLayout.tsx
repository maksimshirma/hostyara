import { ReactNode } from "react";
import MuiCard from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha, styled } from "@mui/material/styles";
import { BrandMark } from "../../components/BrandMark";
import { ColorModeIconDropdown } from "../../theme";
import { surfaces, violet } from "../../theme/tokens";

// Карточка и фон — из шаблона MUI sign-in, цвета — фирменные.
const Card = styled(MuiCard)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignSelf: "center",
  width: "100%",
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  margin: "auto",
  [theme.breakpoints.up("sm")]: { maxWidth: "450px" },
  boxShadow: `${alpha(violet[900], 0.05)} 0px 5px 15px 0px, ${alpha(violet[900], 0.05)} 0px 15px 35px -5px`,
  ...theme.applyStyles("dark", {
    boxShadow: `${alpha("#000000", 0.5)} 0px 5px 15px 0px, ${alpha("#000000", 0.08)} 0px 15px 35px -5px`,
  }),
}));

const Container = styled(Stack)(({ theme }) => ({
  minHeight: "100dvh",
  padding: theme.spacing(2),
  [theme.breakpoints.up("sm")]: { padding: theme.spacing(4) },
  "&::before": {
    content: '""',
    display: "block",
    position: "absolute",
    zIndex: -1,
    inset: 0,
    backgroundImage: `radial-gradient(ellipse at 50% 50%, ${violet[50]}, ${surfaces.light.bg})`,
    backgroundRepeat: "no-repeat",
    ...theme.applyStyles("dark", {
      backgroundImage: `radial-gradient(at 50% 50%, ${alpha(violet[900], 0.35)}, ${surfaces.dark.bgSubtle})`,
    }),
  },
}));

export interface AuthLayoutProps {
  title: string;
  children: ReactNode;
}

// Общий каркас экранов до входа в shell: вход, регистрация, 2FA,
// создание первого пространства, недоступность сервиса.
export function AuthLayout({ title, children }: AuthLayoutProps) {
  return (
    <Container direction="column" sx={{ justifyContent: "space-between" }}>
      <ColorModeIconDropdown sx={{ position: "fixed", top: "1rem", right: "1rem" }} />
      <Card variant="outlined">
        <BrandMark />
        <Typography
          component="h1"
          variant="h4"
          sx={{ width: "100%", fontSize: "clamp(2rem, 10vw, 2.15rem)" }}
        >
          {title}
        </Typography>
        {children}
      </Card>
    </Container>
  );
}
