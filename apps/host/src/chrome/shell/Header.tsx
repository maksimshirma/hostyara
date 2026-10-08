import { ReactNode } from "react";
import Stack from "@mui/material/Stack";
import { useTheme } from "@mui/material/styles";
import { ColorModeIconDropdown } from "../../theme";

// Шапка контентной области на desktop: хлебные крошки и переключатель темы.
export function Header({ breadcrumbs }: { breadcrumbs?: ReactNode }) {
  const theme = useTheme();
  return (
    <Stack
      component="header"
      direction="row"
      spacing={2}
      sx={{
        width: "100%",
        alignItems: "center",
        justifyContent: "space-between",
        pt: 1.5,
        minHeight: 48,
        [theme.breakpoints.down("md")]: { display: "none" },
      }}
    >
      <div>{breadcrumbs}</div>
      <ColorModeIconDropdown />
    </Stack>
  );
}
