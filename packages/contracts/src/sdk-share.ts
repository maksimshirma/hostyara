import { Publication } from "./publication";

export interface SdkShare {
  create(type: string, id: string): Promise<{ url: string; expiresAt: string }>;
  list(type: string, id: string): Promise<Publication[]>;
  revoke(token: string): Promise<void>;
}
