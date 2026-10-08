import { ReactNode } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Toolbar from "@mui/material/Toolbar";
import { BrandMark } from "../components/BrandMark";
import { RouterButton } from "../components/RouterLink";
import { ColorModeIconDropdown } from "../theme";

// Минимальный хром вне shell: публичные страницы (приглашение,
// публикация — IA §5, §8: без меню, без крошек, с CTA на регистрацию)
// и 404 вне пространства.
export function PublicLayout({
  children,
  showSignUp,
}: {
  children: ReactNode;
  showSignUp?: boolean;
}) {
  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default" }}>
      <AppBar
        position="static"
        sx={{
          boxShadow: 0,
          bgcolor: "background.paper",
          backgroundImage: "none",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Toolbar sx={{ gap: 1, color: "text.primary" }}>
          <Box sx={{ mr: "auto" }}>
            <BrandMark />
          </Box>
          <ColorModeIconDropdown />
          {showSignUp && (
            <RouterButton variant="contained" size="small" to="/signup">
              Зарегистрироваться
            </RouterButton>
          )}
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ py: 3 }}>
        {children}
      </Container>
    </Box>
  );
}
