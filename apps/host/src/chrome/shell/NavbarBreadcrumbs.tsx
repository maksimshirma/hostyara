import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import Breadcrumbs, { breadcrumbsClasses } from "@mui/material/Breadcrumbs";
import Typography from "@mui/material/Typography";
import { styled } from "@mui/material/styles";
import { RouterLink } from "../../components/RouterLink";
import { Breadcrumb } from "../breadcrumbs";

// Из шаблона MUI dashboard.
const StyledBreadcrumbs = styled(Breadcrumbs)(({ theme }) => ({
  margin: theme.spacing(1, 0),
  [`& .${breadcrumbsClasses.separator}`]: {
    color: (theme.vars || theme).palette.action.disabled,
    margin: 1,
  },
  [`& .${breadcrumbsClasses.ol}`]: {
    alignItems: "center",
  },
}));

export function NavbarBreadcrumbs({ trail }: { trail: Breadcrumb[] }) {
  if (trail.length === 0) return null;
  return (
    <StyledBreadcrumbs
      aria-label="Хлебные крошки"
      separator={<NavigateNextRoundedIcon fontSize="small" />}
    >
      {trail.map((crumb, index) =>
        crumb.href ? (
          <RouterLink
            key={index}
            href={crumb.href}
            variant="body1"
            underline="hover"
            sx={{ color: "text.secondary" }}
          >
            {crumb.label}
          </RouterLink>
        ) : (
          <Typography
            key={index}
            variant="body1"
            aria-current={index === trail.length - 1 ? "page" : undefined}
            sx={{ color: "text.primary", fontWeight: 600 }}
          >
            {crumb.label}
          </Typography>
        ),
      )}
    </StyledBreadcrumbs>
  );
}
