// One-time migration: populate `state` field from `address` for all casestudies.
// Usage: SANITY_TOKEN=<write-token> node scripts/populate-states.mjs

const PROJECT_ID = 'qwwmf79r';
const DATASET = 'production';
const TOKEN = process.env.SANITY_TOKEN;
const API = `https://${PROJECT_ID}.api.sanity.io/v2023-01-01`;

if (!TOKEN) {
  console.error('Missing SANITY_TOKEN env var');
  process.exit(1);
}

const STATE_ABBREVIATIONS = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  DC: 'District of Columbia',
};

const INFORMAL_ABBREVIATIONS = {
  Ill: 'Illinois',
  Calif: 'California',
  Minn: 'Minnesota',
  Wash: 'Washington',
  Conn: 'Connecticut',
  Mass: 'Massachusetts',
  Penn: 'Pennsylvania',
  Tenn: 'Tennessee',
  Wis: 'Wisconsin',
};

function extractState(address) {
  if (!address) return null;
  const normalized = address.replace(/[\t\n]+/g, ' ').trim();

  // Two-letter abbreviation before ZIP: "TX 78249" or "MI, 48039"
  const abbrMatch = normalized.match(/\b([A-Z]{2}),?\s+\d{5}/);
  if (abbrMatch && STATE_ABBREVIATIONS[abbrMatch[1]]) {
    return STATE_ABBREVIATIONS[abbrMatch[1]];
  }

  // Case-insensitive two-letter abbreviation before ZIP: "Mn 55325"
  const abbrCaseMatch = normalized.match(/\b([A-Za-z]{2}),?\s+\d{5}/);
  if (abbrCaseMatch) {
    const upper = abbrCaseMatch[1].toUpperCase();
    if (STATE_ABBREVIATIONS[upper]) return STATE_ABBREVIATIONS[upper];
  }

  // Full state name (case-insensitive)
  for (const [, name] of Object.entries(STATE_ABBREVIATIONS)) {
    if (new RegExp(`\\b${name}\\b`, 'i').test(normalized)) return name;
  }

  // Informal abbreviations: "Ill", "Calif", etc.
  for (const [abbr, name] of Object.entries(INFORMAL_ABBREVIATIONS)) {
    if (new RegExp(`\\b${abbr}\\b`, 'i').test(normalized)) return name;
  }

  // Standalone two-letter abbreviation at end: "City, TX" or "MN"
  const trailingAbbr = normalized.match(/\b([A-Za-z]{2})\s*$/);
  if (trailingAbbr) {
    const upper = trailingAbbr[1].toUpperCase();
    if (STATE_ABBREVIATIONS[upper]) return STATE_ABBREVIATIONS[upper];
  }

  return null;
}

async function query(groq) {
  const url = `${API}/data/query/${DATASET}?query=${encodeURIComponent(groq)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const json = await res.json();
  return json.result;
}

async function mutate(mutations) {
  const res = await fetch(`${API}/data/mutate/${DATASET}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ mutations }),
  });
  if (!res.ok) {
    throw new Error(`Mutation failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function migrate() {
  const docs = await query(
    '*[_type == "casestudies"]{_id, title, address, state}',
  );
  console.log(`Found ${docs.length} case studies`);

  const toUpdate = [];
  const failed = [];
  let skipped = 0;

  for (const doc of docs) {
    if (doc.state) {
      skipped++;
      continue;
    }

    const state = extractState(doc.address);
    if (!state) {
      failed.push(doc);
      continue;
    }

    toUpdate.push({ id: doc._id, title: doc.title, state });
  }

  // Batch mutations in groups of 50
  const BATCH = 50;
  for (let i = 0; i < toUpdate.length; i += BATCH) {
    const batch = toUpdate.slice(i, i + BATCH);
    const mutations = batch.map((d) => ({
      patch: { id: d.id, set: { state: d.state } },
    }));
    await mutate(mutations);
    console.log(
      `Patched ${Math.min(i + BATCH, toUpdate.length)}/${toUpdate.length}`,
    );
  }

  console.log(
    `\nDone! Updated: ${toUpdate.length} | Skipped: ${skipped} | Failed: ${failed.length}`,
  );

  if (failed.length > 0) {
    console.log('\nNeed manual state entry in Sanity Studio:');
    for (const f of failed) {
      console.log(`  - ${f.title} | address: "${f.address || ''}"`);
    }
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
