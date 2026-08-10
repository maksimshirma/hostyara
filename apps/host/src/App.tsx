import { Button } from "@hostyara/ui";
import styles from "./App.module.css";

export default function App() {
  return (
    <div className={styles.container}>
      <h1>Welcome to Hostyara</h1>
      <p>Host/shell application for a family super-app</p>
      <Button>Click me</Button>
    </div>
  );
}
