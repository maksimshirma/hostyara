import householdsData from "./households.json";

export interface Household {
  hid: string;
  name: string;
}

export interface HouseholdLookup {
  resolve(hid: string): Household | undefined;
}

// Static stand-in for a real household service — mirrors how
// registry.json stands in for the app registry until there's a backend.
export function loadHouseholds(): HouseholdLookup {
  const households = householdsData as Household[];
  return {
    resolve(hid) {
      return households.find((household) => household.hid === hid);
    },
  };
}
