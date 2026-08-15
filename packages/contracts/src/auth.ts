import { User } from "./user";

export interface AuthSDK {
  getUser(): User | null;
  isAuthenticated(): boolean;
}
