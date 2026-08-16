export type Permission = string;

export interface PermissionsSDK {
  hasPermission(permission: Permission): boolean;
}
