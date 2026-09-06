export interface Publication {
  token: string;
  appId: string;
  type: string;
  entityId: string;
  authorId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}
