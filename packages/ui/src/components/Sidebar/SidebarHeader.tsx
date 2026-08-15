import { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";
import styles from "./Sidebar.module.css";

export type SidebarHeaderProps = HTMLAttributes<HTMLDivElement>;

export default function SidebarHeader({ className, ...rest }: SidebarHeaderProps) {
  return <div {...rest} className={cn(styles.header, className)} />;
}
