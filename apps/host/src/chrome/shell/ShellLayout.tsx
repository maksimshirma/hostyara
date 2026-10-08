import { ReactNode } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { User } from "@hostyara/contracts";
import { Household } from "../../router";
import { AppNavbar } from "./AppNavbar";
import { Header } from "./Header";
import { MenuContent } from "./MenuContent";
import { ShellNav } from "./shellNav";
import { SideMenu } from "./SideMenu";
import { UserCard } from "./UserCard";

export interface ShellLayoutProps {
  nav: ShellNav;
  households: Household[];
  currentHid: string | null;
  user: User;
  onLogout(): void;
  breadcrumbs?: ReactNode;
  children: ReactNode;
}

// Каркас shell по шаблону MUI dashboard: боковое меню, шапка с крошками,
// контентная область (страница shell или слот подприложения).
export function ShellLayout({
  nav,
  households,
  currentHid,
  user,
  onLogout,
  breadcrumbs,
  children,
}: ShellLayoutProps) {
  const menu = (onNavigate?: () => void) => (
    <>
      <MenuContent
        nav={nav}
        households={households}
        currentHid={currentHid}
        onNavigate={onNavigate}
      />
      <UserCard user={user} onLogout={onLogout} />
    </>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh" }}>
      <SideMenu>{menu()}</SideMenu>
      <AppNavbar renderMenu={menu} />
      <Box
        component="main"
        sx={{ flexGrow: 1, minWidth: 0, bgcolor: "background.default", overflow: "auto" }}
      >
        <Stack spacing={2} sx={{ mx: 3, pb: 5, mt: { xs: 8, md: 0 } }}>
          <Header breadcrumbs={breadcrumbs} />
          {children}
        </Stack>
      </Box>
    </Box>
  );
}
