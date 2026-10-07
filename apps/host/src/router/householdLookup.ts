export interface Household {
  hid: string;
  name: string;
}

export interface HouseholdLookup {
  resolve(hid: string): Household | undefined;
}

// The signed-in person's households, as listed by identity-service.
export function createHouseholdLookup(households: Household[]): HouseholdLookup {
  return {
    resolve(hid) {
      return households.find((household) => household.hid === hid);
    },
  };
}
