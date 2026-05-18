const STATE_ABBREVIATIONS: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  DC: "District of Columbia",
};

// Common informal abbreviations not covered by the two-letter codes
const INFORMAL_ABBREVIATIONS: Record<string, string> = {
  Ill: "Illinois",
  Calif: "California",
  Minn: "Minnesota",
  Wash: "Washington",
  Conn: "Connecticut",
  Mass: "Massachusetts",
  Penn: "Pennsylvania",
  Tenn: "Tennessee",
  Wis: "Wisconsin",
};

export function extractState(address: string | null | undefined): string | null {
  if (!address) return null;

  const normalized = address.replace(/[\t\n]+/g, " ").trim();

  // Try two-letter abbreviation before a ZIP code: "TX 78249" or "MI, 48039"
  const abbrMatch = normalized.match(/\b([A-Z]{2}),?\s+\d{5}/);
  if (abbrMatch && STATE_ABBREVIATIONS[abbrMatch[1]]) {
    return STATE_ABBREVIATIONS[abbrMatch[1]];
  }

  // Try case-insensitive two-letter abbreviation before ZIP: "Mn 55325"
  const abbrCaseMatch = normalized.match(/\b([A-Za-z]{2}),?\s+\d{5}/);
  if (abbrCaseMatch) {
    const upper = abbrCaseMatch[1].toUpperCase();
    if (STATE_ABBREVIATIONS[upper]) {
      return STATE_ABBREVIATIONS[upper];
    }
  }

  // Try full state name (case-insensitive)
  for (const [, name] of Object.entries(STATE_ABBREVIATIONS)) {
    const re = new RegExp(`\\b${name}\\b`, "i");
    if (re.test(normalized)) {
      return name;
    }
  }

  // Try informal abbreviations: "Ill", "Calif", etc.
  for (const [abbr, name] of Object.entries(INFORMAL_ABBREVIATIONS)) {
    const re = new RegExp(`\\b${abbr}\\b`, "i");
    if (re.test(normalized)) {
      return name;
    }
  }

  // Try standalone two-letter abbreviation at end: "City, TX"
  const trailingAbbr = normalized.match(/\b([A-Za-z]{2})\s*$/);
  if (trailingAbbr) {
    const upper = trailingAbbr[1].toUpperCase();
    if (STATE_ABBREVIATIONS[upper]) {
      return STATE_ABBREVIATIONS[upper];
    }
  }

  return null;
}
