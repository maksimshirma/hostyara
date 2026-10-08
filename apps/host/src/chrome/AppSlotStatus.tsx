import { AccessLevel } from "@hostyara/contracts";
import { SlotErrorReason, SlotStatus } from "./slotStatus";
import styles from "./AppSlotStatus.module.css";

export interface AppSlotStatusProps {
  status: SlotStatus;
  onRetry: () => void;
  onRequestAccess: (level: AccessLevel) => void;
}

function errorText(appName: string, reason: SlotErrorReason): string {
  switch (reason.kind) {
    case "not-installed":
      return `Приложение «${appName}» не подключено`;
    case "no-access":
      return reason.requested
        ? `Запрос доступа к «${appName}» отправлен администраторам пространства`
        : `У вас нет доступа к «${appName}»`;
    case "not-member":
      return "Нет доступа к этому пространству";
    case "access-unavailable":
      return "Не удалось проверить доступ";
    case "incompatible-contract":
      return `«${appName}» несовместимо с этой версией платформы (ожидается контракт ${reason.expectedMajor}, получен ${reason.actualMajor})`;
    case "timeout":
      return `«${appName}» не отвечает`;
    case "load-failed":
      return `Не удалось загрузить «${appName}»: ${reason.message}`;
  }
}

// Retrying makes sense for transient failures only; access screens offer
// their own action (or none).
function isRetryable(reason: SlotErrorReason): boolean {
  return (
    reason.kind === "timeout" ||
    reason.kind === "load-failed" ||
    reason.kind === "access-unavailable"
  );
}

export function AppSlotStatus({ status, onRetry, onRequestAccess }: AppSlotStatusProps) {
  if (status.kind === "loading") {
    return <p className={styles.message}>Загрузка «{status.appName}»…</p>;
  }

  if (status.kind === "error") {
    const { reason } = status;
    return (
      <div className={styles.message}>
        <p>{errorText(status.appName, reason)}</p>
        {reason.kind === "no-access" && !reason.requested && (
          <>
            <button type="button" onClick={() => onRequestAccess("view")}>
              Запросить просмотр
            </button>
            <button type="button" onClick={() => onRequestAccess("edit")}>
              Запросить редактирование
            </button>
          </>
        )}
        {isRetryable(reason) && (
          <button type="button" onClick={onRetry}>
            Повторить
          </button>
        )}
      </div>
    );
  }

  return null;
}
