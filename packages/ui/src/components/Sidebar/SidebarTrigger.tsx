import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";
import { useSidebar } from "./SidebarContext";
import styles from "./Sidebar.module.css";

export interface SidebarTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
}

function DefaultTriggerIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x="1.5" y="2.5" width="13" height="11" rx="2" />
      <line x1="6" y1="2.5" x2="6" y2="13.5" />
    </svg>
  );
}

export default function SidebarTrigger({
  className,
  children,
  onClick,
  "aria-label": ariaLabel = "Toggle sidebar",
  ...rest
}: SidebarTriggerProps) {
  const { collapsed, toggleCollapsed, sidebarId } = useSidebar();

  return (
    <button
      type="button"
      {...rest}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          toggleCollapsed();
        }
      }}
      aria-label={ariaLabel}
      aria-controls={sidebarId}
      aria-expanded={!collapsed}
      className={cn(styles.trigger, className)}
    >
      {children ?? <DefaultTriggerIcon />}
    </button>
  );
}
