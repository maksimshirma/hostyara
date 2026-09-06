import { Button } from "@hostyara/ui";
import { ThemePreference, useTheme } from "./theme";
import { HostChrome } from "./chrome/HostChrome";
import styles from "./App.module.css";

const THEME_OPTIONS: ThemePreference[] = ["system", "light", "dark"];

export default function App() {
  const { preference, theme, setPreference } = useTheme();

  return (
    <div className={styles.container}>
      <h1>Welcome to Hostyara</h1>
      <p>Host/shell application for a family super-app</p>
      <Button>Click me</Button>
      <div className={styles.themeSwitcher} role="radiogroup" aria-label="Theme">
        {THEME_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={preference === option}
            className={preference === option ? styles.themeOptionActive : styles.themeOption}
            onClick={() => setPreference(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <p className={styles.themeStatus}>Active theme: {theme}</p>
      <HostChrome />
    </div>
  );
}
