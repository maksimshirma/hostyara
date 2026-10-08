import { MouseEvent } from "react";
import { useHostRouter } from "./RouterContext";

// Ctrl/Cmd/Shift/Alt-клик и средняя кнопка остаются браузеру — «открыть в
// новой вкладке» должно работать (IA §9: «Ссылка остаётся ссылкой»).
export function isPlainLeftClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

// onClick для настоящего <a href>: обычный клик уходит в host router без
// перезагрузки страницы, остальные — в браузер.
export function useRouterLinkClick(href: string, onNavigate?: () => void) {
  const router = useHostRouter();
  return (event: MouseEvent) => {
    if (event.defaultPrevented || !isPlainLeftClick(event)) return;
    event.preventDefault();
    router.navigate(href);
    onNavigate?.();
  };
}
