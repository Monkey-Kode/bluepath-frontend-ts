// One-time cleanup: unset dead "content box" fields from page documents.
// These were removed from the page schema after pages were normalized onto
// richcontent; the stored values are now orphaned. Unsetting an absent field
// is a no-op, so it is safe to run against every page document.
// Usage: SANITY_TOKEN=<write-token> node scripts/unset-dead-page-fields.mjs

const PROJECT_ID = 'qwwmf79r';
const DATASET = 'production';
const TOKEN = process.env.SANITY_TOKEN;
const API = `https://${PROJECT_ID}.api.sanity.io/v2023-01-01`;

const DEAD_FIELDS = [
  'content',
  'hidetitle',
  'sectionHeadingPosition',
  'sectionContentCTAtext',
  'sectionContentCTAjumpId',
  'sectionContentCTApageLink',
  'sectionContentCTAurl',
];

if (!TOKEN) {
  console.error('Missing SANITY_TOKEN env var');
  process.exit(1);
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

async function run() {
  const fieldFilter = DEAD_FIELDS.map((f) => `defined(${f})`).join(' || ');
  const docs = await query(
    `*[_type == "page" && (${fieldFilter})]{ _id, "slug": slug.current }`,
  );
  console.log(`Found ${docs.length} page documents with orphaned fields`);

  if (docs.length === 0) return;

  const mutations = docs.map((doc) => ({
    patch: { id: doc._id, unset: DEAD_FIELDS },
  }));

  await mutate(mutations);

  for (const doc of docs) {
    console.log(`  unset dead fields on ${doc.slug ?? doc._id}`);
  }
  console.log(`\nDone! Cleaned ${docs.length} documents.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
