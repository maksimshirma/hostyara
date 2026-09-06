import { AppManifest } from "@hostyara/contracts";
import styles from "./AppDock.module.css";

export interface AppDockProps {
  apps: AppManifest[];
  activeAppId: string | null;
  onSelect: (manifest: AppManifest) => void;
}

export function AppDock({ apps, activeAppId, onSelect }: AppDockProps) {
  return (
    <nav className={styles.dock} aria-label="Приложения">
      {apps.map((manifest) => (
        <a
          key={manifest.id}
          href={`/a/${manifest.id}`}
          className={manifest.id === activeAppId ? styles.itemActive : styles.item}
          aria-current={manifest.id === activeAppId ? "page" : undefined}
          onClick={(event) => {
            event.preventDefault();
            onSelect(manifest);
          }}
        >
          {manifest.name}
        </a>
      ))}
    </nav>
  );
}
