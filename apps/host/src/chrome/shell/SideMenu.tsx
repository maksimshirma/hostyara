import { ReactNode } from "react";
import Drawer, { drawerClasses } from "@mui/material/Drawer";
import { useTheme } from "@mui/material/styles";

export const SIDEBAR_WIDTH = 240; // --ui-sidebar-width

// Постоянное меню на desktop (шаблон MUI dashboard). Скрывается на узких
// экранах — там меню открывается из AppNavbar.
export function SideMenu({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        [theme.breakpoints.down("md")]: { display: "none" },
        [`& .${drawerClasses.paper}`]: {
          width: SIDEBAR_WIDTH,
          boxSizing: "border-box",
          backgroundColor: "background.paper",
        },
      }}
    >
      {children}
    </Drawer>
  );
}
