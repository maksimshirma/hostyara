export const SUPPORTED_CONTRACT_MAJOR = "1";

export function getContractMajor(contract: string): string {
  return contract.split(".")[0];
}
