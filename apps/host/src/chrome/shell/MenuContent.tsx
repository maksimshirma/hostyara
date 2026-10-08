import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import { Household } from "../../router";
import { NavList } from "./NavList";
import { ShellNav } from "./shellNav";
import { SpaceSwitcher } from "./SpaceSwitcher";

export interface MenuContentProps {
  nav: ShellNav;
  households: Household[];
  currentHid: string | null;
  onNavigate?: () => void;
}

// Содержимое бокового меню — общее для desktop и мобильного вариантов.
export function MenuContent({ nav, households, currentHid, onNavigate }: MenuContentProps) {
  return (
    <>
      <Box sx={{ display: "flex", p: 1.5 }}>
        <SpaceSwitcher households={households} currentHid={currentHid} />
      </Box>
      <Divider />
      <Box sx={{ overflow: "auto", flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <NavList items={nav.sections} label="Разделы" hideLabel onNavigate={onNavigate} />
        <NavList items={nav.apps} label="Приложения" onNavigate={onNavigate} />
        <Box sx={{ mt: "auto" }}>
          <NavList items={nav.secondary} label="Пространство" hideLabel onNavigate={onNavigate} />
        </Box>
      </Box>
    </>
  );
}
