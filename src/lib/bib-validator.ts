// src/lib/bib-validator.ts

type BibRange = { start: number; end: number };
type RaceCategories = { [category: string]: BibRange };
type Categories = {
  "42K": RaceCategories;
  "21K": RaceCategories;
  "10K": RaceCategories;
  "5K": RaceCategories;
};

export const CATEGORIES: Categories = {
  "42K": {
    "Open Male": { start: 0, end: 100 },
    "Open Female": { start: 101, end: 200 },
    "Bastar Male": { start: 201, end: 400 },
    "Bastar Female": { start: 401, end: 501 },
  },
  "21K": {
    "Open Male": { start: 600, end: 800 },
    "Open Female": { start: 801, end: 900 },
    "Bastar Male": { start: 901, end: 1200 },
    "Bastar Female": { start: 1201, end: 1400 },
  },
  "10K": {
    "Junior Male (U18)": { start: 7000, end: 7199 },
    "Junior Female (U18)": { start: 7300, end: 7499 },
    "Open Male (18+)": { start: 7600, end: 8219 },
    "Open Female (18+)": { start: 8320, end: 8939 },
  },
  "5K": {
    "Sub-Junior (U15)": { start: 9000, end: 9299 },
    "Junior (15-18)": { start: 9400, end: 9699 },
    "Senior (18+)": { start: 9800, end: 11999 },
  },
};

// Bastar district cities
export const BASTAR_CITIES = [
  "bastar",
  "jagdalpur",
  "kondagaon",
  "kanker",
  "narayanpur",
  "bijapur",
  "sukma",
  "dantewada",
];

/**
 * Map raw category column value to internal key
 */
export function normaliseRace(category: string): keyof Categories | null {
  const c = category.trim().toLowerCase();
  if (c.includes("42")) return "42K";
  if (c.includes("21")) return "21K";
  if (c.includes("10")) return "10K";
  if (c.includes("5")) return "5K";
  return null;
}

/**
 * Calculate age from a date-of-birth string/Date as of today
 */
export function calculateAge(dob: string | Date | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/**
 * Determine the sub-category label (for BIB range lookup) from race, gender, city, and age
 */
export function getSubCategory(
  race: keyof Categories,
  gender: string,
  city: string,
  age: number | null,
): string | null {
  const g = gender.trim().toLowerCase();
  const isMale = g === "male" || g === "m";
  const gLabel = isMale ? "Male" : "Female";
  const isBastar = BASTAR_CITIES.includes(city.trim().toLowerCase());

  if (race === "42K" || race === "21K") {
    if (isBastar) return `Bastar ${gLabel}`;
    return `Open ${gLabel}`;
  }

  if (race === "10K") {
    if (age !== null && age < 18) return `Junior ${gLabel} (U18)`;
    return `Open ${gLabel} (18+)`;
  }

  if (race === "5K") {
    if (age !== null && age < 15) return "Sub-Junior (U15)";
    if (age !== null && age >= 15 && age < 18) return "Junior (15-18)";
    return "Senior (18+)";
  }

  return null;
}

/**
 * Validate a BIB number against the expected sub-category range
 */
export function validateBibNumber(
  bibNumber: number,
  race: keyof Categories,
  subCategory: string,
): { valid: boolean; expectedRange?: BibRange } {
  const raceCategories = CATEGORIES[race];
  if (!raceCategories) return { valid: false };

  const bibRange = raceCategories[subCategory];
  if (!bibRange) return { valid: false };

  return {
    valid: bibNumber >= bibRange.start && bibNumber <= bibRange.end,
    expectedRange: bibRange,
  };
}
