import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export function BrandMark() {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Box
        sx={(theme) => ({
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          borderRadius: (theme.vars || theme).shape.borderRadius,
          color: (theme.vars || theme).palette.primary.contrastText,
          backgroundImage: `linear-gradient(135deg, ${theme.palette.info.main}, ${theme.palette.primary.main})`,
        })}
      >
        <HomeRoundedIcon fontSize="small" />
      </Box>
      <Typography component="span" variant="h6" sx={{ fontWeight: 700 }}>
        Хостяра
      </Typography>
    </Box>
  );
}
