import {
  ButtonHTMLAttributes,
  FocusEvent,
  MouseEvent,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../../utils/cn";
import { useSidebar } from "./SidebarContext";
import { extractTextFromChildren } from "./utils";
import styles from "./Sidebar.module.css";

export interface SidebarMenuButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Marks this item as the current/selected page. */
  active?: boolean;
  /** Optional trailing indicator, e.g. an unread count. Hidden while collapsed. */
  badge?: ReactNode;
  /** Icon + label, conventionally `<Icon /><span>Label</span>` — the label is used as the collapsed-state tooltip and hidden visually (but not from assistive tech) when the sidebar collapses. */
  children: ReactNode;
}

interface TooltipPosition {
  top: number;
  left: number;
}

export default function SidebarMenuButton({
  active,
  badge,
  className,
  children,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...rest
}: SidebarMenuButtonProps) {
  const { collapsed } = useSidebar();
  const tooltipText = useMemo(() => extractTextFromChildren(children), [children]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);

  // Tooltip is portalled to the document body and positioned from the button's
  // own rect so it can never be clipped by the sidebar's scroll container.
  const showTooltip = useCallback(() => {
    if (!collapsed || !tooltipText || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setTooltipPosition({
      top: rect.top + rect.height / 2,
      left: rect.right + 8,
    });
  }, [collapsed, tooltipText]);

  const hideTooltip = useCallback(() => setTooltipPosition(null), []);

  return (
    <button
      ref={buttonRef}
      type="button"
      {...rest}
      onMouseEnter={(event: MouseEvent<HTMLButtonElement>) => {
        onMouseEnter?.(event);
        showTooltip();
      }}
      onMouseLeave={(event: MouseEvent<HTMLButtonElement>) => {
        onMouseLeave?.(event);
        hideTooltip();
      }}
      onFocus={(event: FocusEvent<HTMLButtonElement>) => {
        onFocus?.(event);
        showTooltip();
      }}
      onBlur={(event: FocusEvent<HTMLButtonElement>) => {
        onBlur?.(event);
        hideTooltip();
      }}
      aria-current={active ? "page" : undefined}
      data-active={active || undefined}
      className={cn(styles.menuButton, active && styles.menuButtonActive, className)}
    >
      <span className={styles.menuButtonContent}>{children}</span>
      {badge != null && <span className={styles.badge}>{badge}</span>}
      {tooltipPosition &&
        createPortal(
          <span
            role="tooltip"
            className={styles.tooltip}
            style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
          >
            {tooltipText}
          </span>,
          document.body,
        )}
    </button>
  );
}
