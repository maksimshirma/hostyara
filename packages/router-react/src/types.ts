import { NavigationType } from "react-router-dom";

// Local, structural stand-in for react-router's internal `History` shape
// (not exported from the package's public API, so we can't import it) —
// matches the interface `unstable_HistoryRouter`'s `history` prop expects.
// NavigationType *is* public and is the same enum react-router's internal
// `Action` type resolves to, so reusing it keeps `action` assignable.
export interface Path {
  pathname: string;
  search: string;
  hash: string;
}

export type To = string | Partial<Path>;

export type HistoryAction = NavigationType;

export interface HistoryLocation extends Path {
  state: unknown;
  key: string;
}

export type HistoryListener = (update: {
  action: HistoryAction;
  location: HistoryLocation;
  delta: number;
}) => void;

export interface ReactRouterHistory {
  readonly action: HistoryAction;
  readonly location: HistoryLocation;
  createHref(to: To): string;
  createURL(to: To): URL;
  encodeLocation(to: To): Path;
  push(to: To, state?: unknown): void;
  replace(to: To, state?: unknown): void;
  go(delta: number): void;
  listen(listener: HistoryListener): () => void;
}
