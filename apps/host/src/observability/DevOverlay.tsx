import { useEffect, useState } from "react";
import { Observability, SessionSummary } from "./types";
import styles from "./DevOverlay.module.css";

export interface DevOverlayProps {
  observability: Observability;
}

// Dev-only (see historyGuard's own note on why process.env.NODE_ENV rather
// than import.meta.env here: this file is also compiled by ts-jest under
// CommonJS, which import.meta doesn't work under). A production bundle
// still ships this component's code — T23 owns actually stripping it.
export function DevOverlay({ observability }: DevOverlayProps) {
  const [summary, setSummary] = useState<SessionSummary>(() => observability.getSummary());
  const [collapsed, setCollapsed] = useState(true);

  useEffect(
    () => observability.subscribe(() => setSummary(observability.getSummary())),
    [observability],
  );

  if (process.env.NODE_ENV === "production") return null;

  const appIds = Object.keys(summary.crashesByApp);
  const recentMetrics = summary.metrics.slice(-10).reverse();

  return (
    <div className={styles.overlay}>
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setCollapsed((current) => !current)}
      >
        {collapsed ? "▸" : "▾"} Observability ({summary.metrics.length} metrics,{" "}
        {summary.errors.length} errors)
      </button>
      {!collapsed && (
        <div className={styles.body}>
          <h4>Crashes by app</h4>
          {appIds.length === 0 ? (
            <p className={styles.empty}>None this session</p>
          ) : (
            <ul>
              {appIds.map((appId) => (
                <li key={appId}>
                  {appId}: {summary.crashesByApp[appId]}
                </li>
              ))}
            </ul>
          )}
          <h4>Recent metrics</h4>
          {recentMetrics.length === 0 ? (
            <p className={styles.empty}>None yet</p>
          ) : (
            <ul>
              {recentMetrics.map((metric, index) => (
                <li key={index}>
                  {metric.kind} · {metric.appId} · {metric.durationMs.toFixed(1)}ms
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
