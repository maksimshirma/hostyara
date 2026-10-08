import AppsRoundedIcon from "@mui/icons-material/AppsRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import InboxRoundedIcon from "@mui/icons-material/InboxRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import { ReactNode } from "react";
import { useRouterLinkClick } from "../../router";
import { NavIcon, NavItem } from "./shellNav";

const SECTION_ICONS: Record<Exclude<NavIcon, "app">, ReactNode> = {
  home: <HomeRoundedIcon fontSize="small" />,
  search: <SearchRoundedIcon fontSize="small" />,
  inbox: <InboxRoundedIcon fontSize="small" />,
  catalog: <AppsRoundedIcon fontSize="small" />,
  settings: <SettingsRoundedIcon fontSize="small" />,
};

// У приложений в манифесте нет иконки — показываем первую букву названия.
function AppInitial({ label }: { label: string }) {
  return (
    <Box
      aria-hidden
      sx={(theme) => ({
        width: 20,
        height: 20,
        borderRadius: "6px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 600,
        color: (theme.vars || theme).palette.primary.main,
        backgroundColor: (theme.vars || theme).palette.primary[50],
        ...theme.applyStyles("dark", {
          color: (theme.vars || theme).palette.primary[200],
          backgroundColor: (theme.vars || theme).palette.primary[900],
        }),
      })}
    >
      {label.slice(0, 1).toUpperCase()}
    </Box>
  );
}

function NavListItem({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const handleClick = useRouterLinkClick(item.href, onNavigate);
  return (
    <ListItem disablePadding sx={{ display: "block" }}>
      <ListItemButton
        component="a"
        href={item.href}
        selected={item.selected}
        aria-current={item.selected ? "page" : undefined}
        onClick={handleClick}
      >
        <ListItemIcon>
          {item.icon === "app" ? <AppInitial label={item.label} /> : SECTION_ICONS[item.icon]}
        </ListItemIcon>
        <ListItemText primary={item.label} />
      </ListItemButton>
    </ListItem>
  );
}

export interface NavListProps {
  items: NavItem[];
  // Имя landmark-навигации для скринридеров; видимой подписью — если не hideLabel.
  label: string;
  hideLabel?: boolean;
  // Закрыть мобильное меню после перехода.
  onNavigate?: () => void;
}

export function NavList({ items, label, hideLabel, onNavigate }: NavListProps) {
  if (items.length === 0) return null;
  return (
    <List
      component="nav"
      dense
      aria-label={label}
      subheader={
        hideLabel ? undefined : (
          <ListSubheader component="div" disableSticky sx={{ lineHeight: "32px" }}>
            {label}
          </ListSubheader>
        )
      }
      sx={{ p: 1 }}
    >
      {items.map((item) => (
        <NavListItem key={item.id} item={item} onNavigate={onNavigate} />
      ))}
    </List>
  );
}
