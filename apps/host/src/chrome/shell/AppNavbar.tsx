import { ReactNode, useState } from "react";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import AppBar from "@mui/material/AppBar";
import Drawer, { drawerClasses } from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import { useTheme } from "@mui/material/styles";
import { BrandMark } from "../../components/BrandMark";
import { ColorModeIconDropdown } from "../../theme";

export interface AppNavbarProps {
  // Содержимое выезжающего меню; closeMenu закрывает его после перехода.
  renderMenu(closeMenu: () => void): ReactNode;
}

// Верхняя панель на узких экранах (шаблон MUI dashboard) с меню в Drawer.
export function AppNavbar({ renderMenu }: AppNavbarProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const closeMenu = () => setOpen(false);

  return (
    <AppBar
      position="fixed"
      sx={{
        display: "none",
        [theme.breakpoints.down("md")]: { display: "flex" },
        boxShadow: 0,
        bgcolor: "background.paper",
        backgroundImage: "none",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Toolbar sx={{ gap: 1 }}>
        <Stack direction="row" sx={{ mr: "auto", color: "text.primary" }}>
          <BrandMark />
        </Stack>
        <ColorModeIconDropdown />
        <IconButton size="small" aria-label="Меню" onClick={() => setOpen(true)}>
          <MenuRoundedIcon />
        </IconButton>
        <Drawer
          anchor="right"
          open={open}
          onClose={closeMenu}
          sx={{
            zIndex: theme.zIndex.drawer + 1,
            [`& .${drawerClasses.paper}`]: {
              width: "min(320px, 85dvw)",
              backgroundImage: "none",
              backgroundColor: "background.paper",
            },
          }}
        >
          <Stack sx={{ height: "100%" }}>{renderMenu(closeMenu)}</Stack>
        </Drawer>
      </Toolbar>
    </AppBar>
  );
}
