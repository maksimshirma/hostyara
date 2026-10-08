import { MouseEvent } from "react";
import Link, { LinkProps } from "@mui/material/Link";
import { useRouter } from "@tanstack/react-router";

// Ctrl/Cmd/Shift/Alt-клик и средняя кнопка остаются браузеру — «открыть в
// новой вкладке» должно работать (IA §9: «Ссылка остаётся ссылкой»).
export function isPlainLeftClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

// A link to an address the shell has no typed route for — a path inside an
// app, e.g. the tail of the breadcrumbs an app publishes.
export function HrefLink({ href, onClick, ...rest }: LinkProps & { href: string }) {
  const router = useRouter();
  return (
    <Link
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || !isPlainLeftClick(event)) return;
        event.preventDefault();
        void router.navigate({ href });
      }}
      {...rest}
    />
  );
}
