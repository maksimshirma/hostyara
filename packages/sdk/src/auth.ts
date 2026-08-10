import { User } from "@hostyara/contract";

export interface AuthSDK {
  getUser(): User | null;
  isAuthenticated(): boolean;
}
