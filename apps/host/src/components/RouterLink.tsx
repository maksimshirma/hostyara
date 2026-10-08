import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import { createLink } from "@tanstack/react-router";

// Typed links to shell routes: real <a href>, plain clicks go through the
// router, modified clicks ("open in new tab") stay with the browser.
export const RouterLink = createLink(Link);
export const RouterButton = createLink(Button);
