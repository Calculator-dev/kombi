import { z } from "zod";

const text = (max: number) => z.string().trim().max(max).default("");
const fee = z.number().int().min(0).max(100_000);

/**
 * What the rental contract needs about a van beyond its public page: its papers
 * and the amounts the contract names. Only the van's owner sees these.
 */
export const contractTermsSchema = z.object({
  plates: text(20),
  /** Chassis number (VIN). */
  vin: text(30),
  color: text(30),
  /** Where the contract is signed and whose court decides, as it follows "u": "Sarajevu". */
  place: text(60),
  /** Kilometres included per day; 0 = unlimited. */
  kmPerDay: z.number().int().min(0).max(10_000),
  /** Price of kilometres above the limit, one tier per line. */
  extraKm: text(400),
  smokingFee: fee,
  /** The renter's share in any damage. */
  damageFee: fee,
  /** Handling each fine that arrives after the rental. */
  fineFee: fee,
  lateFeePerHour: fee,
  /** The least charged when the van comes back needing cleaning. */
  cleaningFee: fee,
});
export type ContractTerms = z.infer<typeof contractTermsSchema>;

/** Starting values, taken from the sample contract; each owner changes them per van. */
export const DEFAULT_CONTRACT_TERMS: ContractTerms = {
  plates: "",
  vin: "",
  color: "",
  place: "",
  kmPerDay: 500,
  extraKm:
    "do 100 km prekoračenja: 0,35 KM/km\nod 101 do 200 km prekoračenja: 0,45 KM/km\npreko 200 km prekoračenja: 0,55 KM/km",
  smokingFee: 300,
  damageFee: 500,
  fineFee: 30,
  lateFeePerHour: 50,
  cleaningFee: 70,
};

/** Everything that gets filled into the contract for one booking. Empty strings are left blank to fill in by hand. */
export interface ContractData {
  ref: string;
  /** The day the contract is made (YYYY-MM-DD). */
  date: string;
  lessor: { name: string; address: string; companyId: string; representative: string; phone: string; email: string };
  renter: { name: string; jmb: string; idNumber: string; licenseNumber: string; address: string; phone: string; email: string };
  van: { name: string; year: number; location: string };
  start: string;
  end: string;
  pickupTime: string;
  returnTime: string;
  days: number;
  /** Null when the price is by agreement. */
  total: number | null;
  deposit: number;
  minDriverAge: number;
  minLicenseYears: number;
  terms: ContractTerms;
}
