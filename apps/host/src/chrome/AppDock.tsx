import { AppManifest } from "@hostyara/contracts";
import { buildAppPath } from "../router";
import styles from "./AppDock.module.css";

export interface AppDockProps {
  apps: AppManifest[];
  activeAppId: string | null;
  hidSegment: string;
  onSelect: (appId: string) => void;
}

export function AppDock({ apps, activeAppId, hidSegment, onSelect }: AppDockProps) {
  return (
    <nav className={styles.dock} aria-label="Приложения">
      {apps.map((manifest) => (
        <a
          key={manifest.id}
          href={buildAppPath(hidSegment, manifest.id)}
          className={manifest.id === activeAppId ? styles.itemActive : styles.item}
          aria-current={manifest.id === activeAppId ? "page" : undefined}
          onClick={(event) => {
            event.preventDefault();
            onSelect(manifest.id);
          }}
        >
          {manifest.name}
        </a>
      ))}
    </nav>
  );
}
