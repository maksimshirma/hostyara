import { User } from "./user";

export type SdkContext =
  | {
      mode: "household";
      hid: string;
      user: User;
    }
  | { mode: "public"; type: string; id: string };
