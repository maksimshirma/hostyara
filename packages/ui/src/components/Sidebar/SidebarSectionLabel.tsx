import { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";
import styles from "./Sidebar.module.css";

export type SidebarSectionLabelProps = HTMLAttributes<HTMLDivElement>;

export default function SidebarSectionLabel({ className, ...rest }: SidebarSectionLabelProps) {
  return <div {...rest} className={cn(styles.sectionLabel, className)} />;
}
