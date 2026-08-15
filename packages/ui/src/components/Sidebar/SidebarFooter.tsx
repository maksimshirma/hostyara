import { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";
import styles from "./Sidebar.module.css";

export type SidebarFooterProps = HTMLAttributes<HTMLDivElement>;

export default function SidebarFooter({ className, ...rest }: SidebarFooterProps) {
  return <div {...rest} className={cn(styles.footer, className)} />;
}
