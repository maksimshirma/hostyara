import Sidebar from "./Sidebar";
import SidebarContent from "./SidebarContent";
import SidebarFooter from "./SidebarFooter";
import SidebarHeader from "./SidebarHeader";
import SidebarMenu from "./SidebarMenu";
import SidebarMenuButton from "./SidebarMenuButton";
import SidebarMenuItem from "./SidebarMenuItem";
import SidebarSection from "./SidebarSection";
import SidebarSectionLabel from "./SidebarSectionLabel";
import SidebarTrigger from "./SidebarTrigger";

const SidebarNamespace = Object.assign(Sidebar, {
  Header: SidebarHeader,
  Content: SidebarContent,
  Section: SidebarSection,
  SectionLabel: SidebarSectionLabel,
  Menu: SidebarMenu,
  MenuItem: SidebarMenuItem,
  MenuButton: SidebarMenuButton,
  Footer: SidebarFooter,
  Trigger: SidebarTrigger,
});

export { SidebarNamespace as Sidebar };
export {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSection,
  SidebarSectionLabel,
  SidebarTrigger,
};
export { useSidebar } from "./SidebarContext";
export type { SidebarContextValue } from "./SidebarContext";
export type { SidebarProps } from "./Sidebar";
export type { SidebarContentProps } from "./SidebarContent";
export type { SidebarFooterProps } from "./SidebarFooter";
export type { SidebarHeaderProps } from "./SidebarHeader";
export type { SidebarMenuProps } from "./SidebarMenu";
export type { SidebarMenuButtonProps } from "./SidebarMenuButton";
export type { SidebarMenuItemProps } from "./SidebarMenuItem";
export type { SidebarSectionProps } from "./SidebarSection";
export type { SidebarSectionLabelProps } from "./SidebarSectionLabel";
export type { SidebarTriggerProps } from "./SidebarTrigger";
