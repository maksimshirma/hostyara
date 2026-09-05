import { User } from "./user";

export type SdkContext =
  | { mode: "household"; hid: string; user: User; permissions: string[] }
  | { mode: "public"; type: string; id: string };
