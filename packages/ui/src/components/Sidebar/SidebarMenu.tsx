import { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";
import styles from "./Sidebar.module.css";

export type SidebarMenuProps = HTMLAttributes<HTMLUListElement>;

export default function SidebarMenu({ className, ...rest }: SidebarMenuProps) {
  return <ul {...rest} className={cn(styles.menu, className)} />;
}
