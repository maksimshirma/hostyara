import { AppManifest } from "@hostyara/contracts";

function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    // A relative URL is same-origin already — 'self' already covers it,
    // nothing to add.
    return "'self'";
  }
}

function directive(name: string, values: Set<string>): string {
  return `${name} ${Array.from(values).join(" ")}`;
}

// tech.md §8: the policy is derived entirely from the registry, not
// hand-maintained — script-src/connect-src get remoteEntry's own origin
// (Module Federation loads it via a real <script> tag, and its runtime
// may fetch chunks from the same origin too); style-src/connect-src get
// every mount.styles origin (the mount manager fetches that CSS as text
// and injects it as an inline <style> — 'unsafe-inline' covers the
// injection, connect-src covers the fetch); connect-src gets the union of
// every installed app's own declared network.connect. frame-src also gets
// remoteEntry's origin — CSP's frame-src falls back to default-src when
// omitted, and default-src 'self' would silently block T16/T17's
// mount.type: "iframe" apps, whose remoteEntry is the iframe's own src.
export function buildContentSecurityPolicy(manifests: AppManifest[]): string {
  const scriptSrc = new Set<string>(["'self'"]);
  const styleSrc = new Set<string>(["'self'", "'unsafe-inline'"]);
  const connectSrc = new Set<string>(["'self'"]);
  const frameSrc = new Set<string>(["'self'"]);

  for (const manifest of manifests) {
    const remoteOrigin = originOf(manifest.mount.remoteEntry);
    scriptSrc.add(remoteOrigin);
    connectSrc.add(remoteOrigin);
    frameSrc.add(remoteOrigin);

    for (const styleUrl of manifest.mount.styles) {
      const styleOrigin = originOf(styleUrl);
      styleSrc.add(styleOrigin);
      connectSrc.add(styleOrigin);
    }

    for (const domain of manifest.network.connect) {
      connectSrc.add(originOf(domain));
    }
  }

  return [
    "default-src 'self'",
    directive("script-src", scriptSrc),
    directive("style-src", styleSrc),
    directive("connect-src", connectSrc),
    directive("frame-src", frameSrc),
  ].join("; ");
}
