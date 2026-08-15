import { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";
import styles from "./Sidebar.module.css";

export type SidebarMenuItemProps = HTMLAttributes<HTMLLIElement>;

export default function SidebarMenuItem({ className, ...rest }: SidebarMenuItemProps) {
  return <li {...rest} className={cn(styles.menuItem, className)} />;
}
