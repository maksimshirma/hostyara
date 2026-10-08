import AddRoundedIcon from "@mui/icons-material/AddRounded";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import MenuItem from "@mui/material/MenuItem";
import Select, { selectClasses } from "@mui/material/Select";
import { Household, paths, useHostRouter } from "../../router";

const CREATE_SPACE = "__create__";

function SpaceAvatar({ name }: { name: string }) {
  return (
    <Avatar
      aria-hidden
      variant="rounded"
      sx={(theme) => ({
        width: 28,
        height: 28,
        fontSize: 14,
        backgroundColor: (theme.vars || theme).palette.primary.main,
        color: (theme.vars || theme).palette.primary.contrastText,
      })}
    >
      {name.slice(0, 1).toUpperCase()}
    </Avatar>
  );
}

export interface SpaceSwitcherProps {
  households: Household[];
  // hid открытого пространства; null — вне пространства (личная зона).
  currentHid: string | null;
}

// Переключатель пространства (IA §8) — по мотивам SelectContent из шаблона
// MUI dashboard.
export function SpaceSwitcher({ households, currentHid }: SpaceSwitcherProps) {
  const router = useHostRouter();

  function handleChange(value: string) {
    router.navigate(value === CREATE_SPACE ? paths.newSpace() : paths.space(value));
  }

  return (
    <Select
      value={currentHid ?? ""}
      onChange={(event) => handleChange(event.target.value)}
      displayEmpty
      fullWidth
      inputProps={{ "aria-label": "Пространство" }}
      renderValue={(hid) => {
        const household = households.find((candidate) => candidate.hid === hid);
        return household ? (
          <>
            <ListItemAvatar sx={{ minWidth: 0, mr: 1.5 }}>
              <SpaceAvatar name={household.name} />
            </ListItemAvatar>
            <ListItemText primary={household.name} secondary="Пространство" />
          </>
        ) : (
          <ListItemText primary="Выберите пространство" />
        );
      }}
      sx={{
        maxHeight: 56,
        [`& .${selectClasses.select}`]: {
          display: "flex",
          alignItems: "center",
          gap: "2px",
          pl: 1,
        },
      }}
    >
      <ListSubheader sx={{ pt: 0 }}>Мои пространства</ListSubheader>
      {households.map((household) => (
        <MenuItem key={household.hid} value={household.hid}>
          <ListItemAvatar sx={{ minWidth: 0, mr: 1.5 }}>
            <SpaceAvatar name={household.name} />
          </ListItemAvatar>
          <ListItemText primary={household.name} />
        </MenuItem>
      ))}
      <Divider sx={{ mx: -1 }} />
      <MenuItem value={CREATE_SPACE}>
        <ListItemIcon>
          <AddRoundedIcon />
        </ListItemIcon>
        <ListItemText primary="Создать пространство" />
      </MenuItem>
    </Select>
  );
}
