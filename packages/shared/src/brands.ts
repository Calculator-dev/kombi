/**
 * Vehicle makes an owner picks from. "other" is for anything not listed; the
 * name of the vehicle still says what it is.
 */
export const BRANDS = [
  ["alfaromeo", "Alfa Romeo"],
  ["audi", "Audi"],
  ["bmw", "BMW"],
  ["chevrolet", "Chevrolet"],
  ["citroen", "Citroën"],
  ["cupra", "Cupra"],
  ["dacia", "Dacia"],
  ["fiat", "Fiat"],
  ["ford", "Ford"],
  ["honda", "Honda"],
  ["hyundai", "Hyundai"],
  ["iveco", "Iveco"],
  ["jeep", "Jeep"],
  ["kia", "Kia"],
  ["landrover", "Land Rover"],
  ["lexus", "Lexus"],
  ["man", "MAN"],
  ["mazda", "Mazda"],
  ["mercedes", "Mercedes-Benz"],
  ["mini", "MINI"],
  ["mitsubishi", "Mitsubishi"],
  ["nissan", "Nissan"],
  ["opel", "Opel"],
  ["peugeot", "Peugeot"],
  ["porsche", "Porsche"],
  ["renault", "Renault"],
  ["seat", "SEAT"],
  ["skoda", "Škoda"],
  ["subaru", "Subaru"],
  ["suzuki", "Suzuki"],
  ["tesla", "Tesla"],
  ["toyota", "Toyota"],
  ["volkswagen", "Volkswagen"],
  ["volvo", "Volvo"],
  ["other", "Drugo"],
] as const;
export type BrandId = (typeof BRANDS)[number][0];
export const BRAND_IDS = BRANDS.map(([id]) => id) as [BrandId, ...BrandId[]];
export const brandName = (id: string | null | undefined) => BRANDS.find(([b]) => b === id)?.[1] ?? "";

/** Guesses the make from a vehicle's name ("VW Golf" → volkswagen), for vans saved before makes were asked. */
export function guessBrand(name: string): BrandId | null {
  const n = name.toLowerCase();
  const alias: [string, BrandId][] = [["vw ", "volkswagen"], ["mercedes", "mercedes"], ["škoda", "skoda"], ["citroen", "citroen"], ["alfa", "alfaromeo"], ["land rover", "landrover"]];
  for (const [a, id] of alias) if (n.startsWith(a) || n.includes(` ${a.trim()} `)) return id;
  const hit = BRANDS.find(([id, label]) => id !== "other" && (n.startsWith(label.toLowerCase()) || n.startsWith(id)));
  return hit ? hit[0] : null;
}
