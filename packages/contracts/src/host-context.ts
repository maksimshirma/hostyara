import { Permission } from "./permissions";

export interface HostContext {
  userId: string;
  permissions: Permission[];
}
