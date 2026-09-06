import { SlotErrorReason, SlotStatus } from "./slotStatus";
import styles from "./AppSlotStatus.module.css";

export interface AppSlotStatusProps {
  status: SlotStatus;
  onRetry: () => void;
}

function errorText(appName: string, reason: SlotErrorReason): string {
  switch (reason.kind) {
    case "not-installed":
      return `Приложение «${appName}» не подключено`;
    case "incompatible-contract":
      return `«${appName}» несовместимо с этой версией платформы (ожидается контракт ${reason.expectedMajor}, получен ${reason.actualMajor})`;
    case "timeout":
      return `«${appName}» не отвечает`;
    case "load-failed":
      return `Не удалось загрузить «${appName}»: ${reason.message}`;
  }
}

export function AppSlotStatus({ status, onRetry }: AppSlotStatusProps) {
  if (status.kind === "loading") {
    return <p className={styles.message}>Загрузка «{status.appName}»…</p>;
  }

  if (status.kind === "error") {
    return (
      <div className={styles.message}>
        <p>{errorText(status.appName, status.reason)}</p>
        <button type="button" onClick={onRetry}>
          Повторить
        </button>
      </div>
    );
  }

  return null;
}
