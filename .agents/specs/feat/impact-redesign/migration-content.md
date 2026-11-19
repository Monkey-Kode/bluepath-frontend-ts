# Migration content reference (Impact redesign)

Source of truth for seeding the `impactPageContent` singleton (T011). Combines
the May 2026 fika mockups (`./assets/`) with the existing `impact` /
`carbonoffsets` documents in dataset `production` (queried 2026-06-08).

> **Display strings, not stored numbers.** Carbon `value` is a free display
> string ("4.5 Billion"). Environmental `stat.value` is a plain integer string
> ("56657") — the frontend adds thousands separators at render (FR-016).
>
> **Icons are re-referenced, never re-uploaded** (FR-023). Every `_ref` below is
> an existing asset.

---

## Carbon Offsets — icon → asset map (left-to-right, FR-024)

Mockup icon order: **coal, forest, oil, smartphone, recycle**. The 5 icons were
stored as unlabeled GIFs in the old hive; paired by visually inspecting each
asset (4 unambiguous + forest by elimination / shield-base shape):

| # | Icon       | Asset `_ref`                                                     | (old hex) |
|---|------------|------------------------------------------------------------------|-----------|
| 1 | coal       | `image-911cf932f4fab989cfe9b2c4f1902a1c79d1ba83-600x854-gif`      | hex7 (factory + smoke) |
| 2 | forest     | `image-9be9a57122f3908b78eec6686592ac19825f5314-600x854-gif`      | hex2 (trees-in-shield) |
| 3 | oil        | `image-16796ebe6db8578c9fbd031be67948a673e88f0a-482x498-gif`      | hex9 (oil barrel + drop) |
| 4 | smartphone | `image-c0a267bfb6767d6786f29b0c6ecd73a25597f70f-600x854-gif`      | hex4 (phone + charge cable) |
| 5 | recycle    | `image-29b028d43afda898d34e39e614aab70a491beeb8-600x620-gif`      | hex5 (recycle arrows) |

The same 5 icon refs are reused (in this order) in all 3 tabs — the row is
fixed; only value/label swap.

## Carbon Offsets — 3 tabs × 5 metrics (value + label)

Labels are per-metric (constant across tabs). PROJECT LIFE / USEFUL LIFE values
are taken from the mockups exactly; AS OF TODAY is not in the mockups, so its
values are the stored figures rendered in the same display style.

Labels (constant):
- coal → `Pounds of Coal Not Burned`
- forest → `Acres of U.S. Forest Preserved from Conversion to Cropland in One Year`
- oil → `Barrels of Oil Not Consumed`
- smartphone → `Smartphones Recharged`  (mockup: "Recharged", was "Charged")
- recycle → `Trash Bags of Waste Recycled Instead of Landfilled`

### Tab 1 — PROJECT LIFE
| icon | value |
|------|-------|
| coal | `4.5 Billion` |
| forest | `27,905 Acres` |
| oil | `9.6 Million` |
| smartphone | `526 Billion` |
| recycle | `175.5 Million` |

### Tab 2 — USEFUL LIFE
| icon | value |
|------|-------|
| coal | `4 Billion` |
| forest | `24,579 Acres` |
| oil | `8.4 Million` |
| smartphone | `442 Billion`  (mockup; stored figure was 463 — adopt mockup) |
| recycle | `154.6 Million` |

### Tab 3 — AS OF TODAY (derived from stored figures, mockup style)
| icon | value |
|------|-------|
| coal | `680 Million` |
| forest | `4,176 Acres` |
| oil | `1.4 Million` |
| smartphone | `78.7 Billion` |
| recycle | `26.2 Million` |

---

## Environmental Impact — category → icon asset map (FR-024)

Order: **SOLAR PROJECTS | BUILDING ENERGY | WATER CONSERVATION | CO2 REDUCTION**.
Stored `name` is title-case; the frontend uppercases the tab labels for display
(so "Water Conservation" → `WATER CONSERVATION`, the exact label required).

| Category | icon `_ref` | (from impact doc) |
|----------|-------------|-------------------|
| Solar Projects | `image-c66c61d8ce1866cf91f561c02ab759981a8674a4-500x483-png` | Solar Projects |
| Building Energy | `image-1da35f0a1b6a658a3eb6271af686c539d1421327-500x483-png` | Building Energy |
| Water Conservation | `image-9456b150326d80629bdf8e618baaaad0ca9c1f8e-500x483-png` | WATER SAVINGS |
| CO2 Reduction | `image-06ae5e1caffe2e37510d6b76f0de3234cd412ac1-500x483-png` | CO2 REDUCTION |

## Environmental Impact — 4 categories × (summary + 3 stats)

Summaries are sentence-cased (FR-024). Solar stats use mockup labels exactly
("annually", "Recharged"-style); the other 3 categories' stats are migrated 1:1
from existing fields (no mockup data — the building-energy mockup reused solar's
numbers as a placeholder). Stat `value` is a plain integer string; the frontend
adds separators.

### Solar Projects
- summary: `Solar panels generating renewable power directly to the building`
- stats:
  1. `56657` — `average MWh generated annually`
  2. `5164` — `average U.S. households powered annually`
  3. `1416416` — `MWh savings during technology lifetime`

### Building Energy
- summary: `Reduction in building energy use`
- stats:
  1. `100133` — `average MWh saved each year`
  2. `9126` — `average U.S. households' electricity use avoided each year`
  3. `1627160` — `MWh savings during technology lifetime`

### Water Conservation
- summary: `Reduction in building water use`
- stats:
  1. `35656766` — `average gallons of water saved each year`
  2. `326` — `average U.S. households' water use avoided each year`
  3. `713135312` — `gallons of water savings during technology lifetime`

### CO2 Reduction
- summary: `Carbon dioxide emission abated`
- stats:
  1. `357856` — `passenger vehicles driven/removed from road for 1 year`
  2. `14290` — `average U.S. households' CO2 emissions avoided each year`
  3. `35583763` — `tree seedlings grown for 10 years`

---

## Old documents (delete after cutover verified — T037)

- carbonoffsets tabs: `1074d1d0-a37a-4920-b44d-fad05d60bbf3` (PROJECT LIFE),
  `14ec598c-4f25-4e9f-8152-8307a8bd0b39` (USEFUL LIFE),
  `e3d58c37-5a02-4996-950d-d08115adea43` (AS OF TODAY)
- impact items: `587fb546-…` (Solar), `851692c2-…` (Building),
  `50388dbb-…` (Water), `bcab7460-…` (CO2)
- Icon assets are retained — they are re-referenced by the singleton.
