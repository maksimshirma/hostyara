import { isValidElement, ReactNode } from "react";

/** Walks a children tree and concatenates its string/number leaves, used to derive a collapsed-state tooltip label from `<Icon /><span>Label</span>` children without a separate duplicated prop. */
export function extractTextFromChildren(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }

  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).filter(Boolean).join(" ");
  }

  if (isValidElement<{ children?: ReactNode }>(children)) {
    return extractTextFromChildren(children.props.children);
  }

  return "";
}
