import { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";
import styles from "./Sidebar.module.css";

export type SidebarContentProps = HTMLAttributes<HTMLDivElement>;

export default function SidebarContent({ className, ...rest }: SidebarContentProps) {
  return <div {...rest} className={cn(styles.content, className)} />;
}
