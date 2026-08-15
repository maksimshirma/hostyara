import { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";
import styles from "./Sidebar.module.css";

export type SidebarSectionProps = HTMLAttributes<HTMLDivElement>;

export default function SidebarSection({ className, ...rest }: SidebarSectionProps) {
  return <div {...rest} className={cn(styles.section, className)} />;
}
