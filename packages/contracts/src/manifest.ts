import { AppMount } from "./app-mount";
import { AppNetwork } from "./network";
import { AppSurfaces } from "./surfaces";
import { EntityRoute } from "./entity-route";
import { Permission } from "./permissions";
import { ShareDescriptor } from "./share-descriptor";

export interface AppManifest {
  id: string;
  name: string;
  version: string;
  contract: string;
  category: string;
  tags: string[];
  surfaces: AppSurfaces;
  permissions: Permission[];
  entities: EntityRoute[];
  share?: ShareDescriptor;
  routes: string[];
  mount: AppMount;
  network: AppNetwork;
}
