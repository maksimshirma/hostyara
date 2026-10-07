import { useState } from "react";
import { isSdkApiError } from "@hostyara/contracts";
import { ownAppId, useSdk } from "./sdkContext";

// Demonstrates sdk.api: a call to this app's own backend through the host
// and the BFF. The app never sees a token — the backend gets one, scoped to
// this app.
export function BackendCheck() {
  const sdk = useSdk();
  const [result, setResult] = useState<string | null>(null);

  async function check() {
    try {
      const response = await sdk.api.request<{ claims?: { aud?: string; scope?: string[] } }>(
        ownAppId(sdk),
        "/ping",
      );
      setResult(`Бэкенд ответил: ${response.claims?.aud} (${response.claims?.scope?.join(", ")})`);
    } catch (error) {
      setResult(`Бэкенд недоступен: ${isSdkApiError(error) ? error.code : String(error)}`);
    }
  }

  return (
    <div>
      <button type="button" onClick={() => void check()}>
        Проверить бэкенд
      </button>
      {result && <p role="status">{result}</p>}
    </div>
  );
}
