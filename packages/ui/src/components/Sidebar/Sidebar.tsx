import { HTMLAttributes, ReactNode, useCallback, useId, useMemo } from "react";
import { useControllableState } from "../../hooks/useControllableState";
import { cn } from "../../utils/cn";
import { SidebarContext, SidebarContextValue } from "./SidebarContext";
import styles from "./Sidebar.module.css";

export interface SidebarProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** Controlled collapsed state. Omit to let the sidebar manage its own state. */
  collapsed?: boolean;
  /** Initial collapsed state when uncontrolled. */
  defaultCollapsed?: boolean;
  /** Called whenever the collapsed state changes, controlled or not. */
  onCollapsedChange?: (collapsed: boolean) => void;
  children: ReactNode;
}

export default function Sidebar({
  collapsed,
  defaultCollapsed = false,
  onCollapsedChange,
  className,
  children,
  ...rest
}: SidebarProps) {
  const sidebarId = useId();
  const [isCollapsed, setIsCollapsed] = useControllableState({
    value: collapsed,
    defaultValue: defaultCollapsed,
    onChange: onCollapsedChange,
  });

  const toggleCollapsed = useCallback(
    () => setIsCollapsed(!isCollapsed),
    [isCollapsed, setIsCollapsed],
  );

  const contextValue = useMemo<SidebarContextValue>(
    () => ({ collapsed: isCollapsed, setCollapsed: setIsCollapsed, toggleCollapsed, sidebarId }),
    [isCollapsed, setIsCollapsed, toggleCollapsed, sidebarId],
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <aside
        {...rest}
        id={sidebarId}
        data-collapsed={isCollapsed}
        className={cn(styles.sidebar, className)}
      >
        {children}
      </aside>
    </SidebarContext.Provider>
  );
}
