export const PAKISTAN_CARS: Record<string, string[]> = {
  Suzuki: ["Mehran", "Alto", "Cultus", "Wagon R", "Swift"],
  Toyota: ["Corolla", "Yaris", "Hilux", "Fortuner", "Prado"],
  Honda: ["Civic", "City", "HR-V", "BR-V"],
  Kia: ["Sportage", "Picanto"],
  Hyundai: ["Tucson", "Elantra"],
  Changan: ["Alsvin"],
  MG: ["HS"],
};

export const PAKISTAN_CAR_MAKES = Object.keys(PAKISTAN_CARS);

export const VEHICLE_YEARS: number[] = Array.from(
  { length: new Date().getFullYear() - 1999 },
  (_, i) => new Date().getFullYear() - i,
);
