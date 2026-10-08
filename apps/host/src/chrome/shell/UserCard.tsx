import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { User } from "@hostyara/contracts";
import { RouterLink } from "../../components/RouterLink";

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export interface UserCardProps {
  user: User;
  onLogout(): void;
}

// Подвал меню: человек (ссылка в личную зону) и выход.
export function UserCard({ user, onLogout }: UserCardProps) {
  return (
    <Stack
      direction="row"
      sx={{ p: 2, gap: 1, alignItems: "center", borderTop: "1px solid", borderColor: "divider" }}
    >
      <Avatar aria-hidden sx={{ width: 36, height: 36, fontSize: 14 }}>
        {initialsOf(user.name)}
      </Avatar>
      <Box sx={{ mr: "auto", minWidth: 0 }}>
        <RouterLink
          to="/account"
          underline="none"
          color="text.primary"
          variant="body2"
          sx={{ display: "block", fontWeight: 500, lineHeight: "16px" }}
          noWrap
        >
          {user.name}
        </RouterLink>
        <Typography variant="caption" sx={{ color: "text.secondary" }} noWrap component="div">
          {user.email}
        </Typography>
      </Box>
      <IconButton size="small" aria-label="Выйти" onClick={onLogout}>
        <LogoutRoundedIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}
