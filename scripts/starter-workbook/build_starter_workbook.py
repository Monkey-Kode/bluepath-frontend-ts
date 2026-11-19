# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl>=3.1"]
# ///
"""Build the starter workbook that combines BlueIQ's plants with the website's projects (Story 8).

Run it from bluepath-frontend-ts in isolated mode, and pass every path:

    uv run --no-project --with openpyxl python -I -B \\
        scripts/starter-workbook/build_starter_workbook.py \\
        --blueiq BlueIQ-Plant-Locations-9.29.26.xlsx \\
        --website website-projects.json \\
        --reconciliation Website_Address_Reconciliation_2026-10-14.xlsx \\
        --out starter-workbook.xlsx

`website-projects.json` holds the published `casestudies` documents from Sanity. It can be a JSON
array or the API's `{"result": [...]}` body. This query gives the needed fields:

    *[_type == "casestudies"]{_id, title, address, state, location, entity, financing, size,
      technologies}

The inputs are client files. Never commit them or the workbook.
"""

import argparse
import json
import math
import re
import sys
from collections import Counter
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

import openpyxl
from openpyxl.styles import Alignment, Font

BLUEIQ_TAB = "Plant Locations"
MATCHES_TAB = "Address Reconciliation"
WEBSITE_ONLY_TAB = "Website Only"
PROJECTS_TAB = "Projects"
REVIEW_TAB = "Review"
HOW_TO_TAB = "How-to"

BLUEIQ_HEADERS = [
    "Plant ID", "Plant Name", "Project ID", "Project Name", "Project Type",
    "Technology (BlueIQ value)", "Project Status", "Active", "Latitude", "Longitude",
    "Address", "City", "State", "ZIP", "County",
]
WEBSITE_HEADERS = ["Entity Type", "Financing Type", "Size ($)", "Technologies", "Website ID"]
PROJECT_HEADERS = BLUEIQ_HEADERS + WEBSITE_HEADERS
# On a merged row, these come from the website's address and nothing else (AC-8.6).
ADDRESS_HEADERS = ["Address", "City", "State", "ZIP"]
MATCH_HEADERS = ["Website Project Name", "BlueIQ Plant ID", "Flags"]
WEAK_FLAG = "Weak project match"
# List columns in every map project file separate values with semicolons.
LIST_SEPARATOR = "; "

# The Review tab's checks, in tab order (AC-8.4). The last one is ours: a website-only project
# whose address and State field disagree takes the address's state, so BluePath confirms it.
SHARED_CHECK = "Shares a plant"
WEAK_CHECK = "Weak match"
STATE_CHECK = "State differs from BlueIQ"
CITY_CHECK = "No city"
COORDINATES_CHECK = "No coordinates"
TYPE_CHECK = "No Project Type"
STATE_FIELD_CHECK = "Address and State field differ"
REVIEW_CHECKS = [
    SHARED_CHECK, WEAK_CHECK, STATE_CHECK, CITY_CHECK, COORDINATES_CHECK, TYPE_CHECK,
    STATE_FIELD_CHECK,
]
REVIEW_HEADERS = [
    "Check", "Plant ID", "Plant Name", "Website Project Name", "Website ID", "Details",
    "BluePath's Answer",
]

_FROM_WEBSITE_ADDRESS = "The website on rows with a Website ID. BlueIQ on the rest."
# The How-to tab's column notes: where each value comes from, and what the site does with it.
COLUMN_NOTES = {
    "Plant ID": ("BlueIQ", "Matches each daily file's rows to their projects. Blank on "
                 "website-only rows."),
    "Plant Name": ("BlueIQ", "The marker name and the panel title."),
    "Project ID": ("BlueIQ", "Groups plants into one ticker entry."),
    "Project Name": ("BlueIQ. The website's title on website-only rows.",
                     "The panel, ticker, and case study title."),
    "Project Type": ("BlueIQ", "Sets the map category. When it's blank, the map uses "
                     "Technologies."),
    "Technology (BlueIQ value)": ("BlueIQ", "Imports ignore it, because it repeats Project Type."),
    "Project Status": ("BlueIQ", "Shown in the panel."),
    "Active": ("BlueIQ", "No keeps the project off the map and ticker. Yes or blank shows it."),
    "Latitude": ("BlueIQ. The website on website-only rows.",
                 "The marker position, in decimal degrees."),
    "Longitude": ("BlueIQ. The website on website-only rows.",
                  "The marker position, in decimal degrees."),
    "Address": (_FROM_WEBSITE_ADDRESS, "The website's address replaces BlueIQ's on merged rows."),
    "City": (_FROM_WEBSITE_ADDRESS, "Shown in the panel."),
    "State": (_FROM_WEBSITE_ADDRESS, "A two-letter code. Shown in the panel and the ticker."),
    "ZIP": (_FROM_WEBSITE_ADDRESS, "Kept as text, so leading zeros stay."),
    "County": ("BlueIQ", "Not shown today."),
    "Entity Type": ("The website", "Semicolons separate the values. Shown in the panel and the "
                    "ticker."),
    "Financing Type": ("The website", "Semicolons separate the values. Shown in the panel."),
    "Size ($)": ("The website", "A plain number of dollars. Shown in the panel and the ticker."),
    "Technologies": ("The website", "Semicolons separate the values. Sets the category when "
                     "Project Type is blank."),
    "Website ID": ("The website", "Links the row to its website project. Only the one-time load "
                   "reads it."),
}

# Ported from .agents/scripts/export-case-studies-blueiq.py.
STATES = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA",
    "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "District of Columbia": "DC",
    "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL",
    "Indiana": "IN", "Iowa": "IA", "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA",
    "Maine": "ME", "Maryland": "MD", "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN",
    "Mississippi": "MS", "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
    "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
    "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK", "Oregon": "OR",
    "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD",
    "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT", "Virginia": "VA",
    "Washington": "WA", "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY",
}
STATE_ALIASES = {"Ill": "IL"}
_NAMES = "|".join(sorted([*STATES, *STATE_ALIASES], key=len, reverse=True))
_CODES = "|".join(STATES.values())
# A trailing state is a full name in any case, or a two-letter code that is upper case or follows
# a comma. So words like "or" and "in" at the end of a street don't read as states.
STATE_TOKEN = re.compile(
    rf"(?:,\s*(?P<after_comma>(?i:{_NAMES}|{_CODES}))|(?:^|\s)(?P<bare>(?i:{_NAMES})|{_CODES}))\b[\s,]*$"
)
ZIP = re.compile(r"\b(\d{5})(?:-\d{4})?\b")
_STATE_CODES = {k.lower(): v for k, v in [*STATES.items(), *STATE_ALIASES.items()]}


class InputError(Exception):
    """An input breaks a rule, so the script writes nothing."""


def state_code(name):
    return _STATE_CODES.get(name.strip().lower()) or name.strip().upper()


def parse_address(raw):
    """Split a free-text website address into street, city, state code, and ZIP."""
    lines = [re.sub(r"\s+", " ", line).strip(" ,") for line in (raw or "").splitlines()]
    text = ", ".join(line for line in lines if line)
    zip_code = None
    # A ZIP must end the address, state aside, so a leading street number never reads as one.
    for m in reversed(list(ZIP.finditer(text))):
        if not STATE_TOKEN.sub("", text[m.end():]).strip(" ,"):
            zip_code, text = m.group(1), text[:m.start()] + text[m.end():]
            break
    state = None
    if m := STATE_TOKEN.search(text):
        state, text = state_code(m["after_comma"] or m["bare"]), text[:m.start()]
    text = re.sub(r"(,\s*)+", ", ", text).strip(" ,")
    parts = [p.strip() for p in text.split(",") if p.strip()]
    if not parts:
        return None, None, state, zip_code
    if len(parts) == 1:
        street_only = parts[0][0].isdigit()
        return (parts[0], None, state, zip_code) if street_only else (None, parts[0], state, zip_code)
    return ", ".join(parts[:-1]), parts[-1], state, zip_code


@dataclass
class StarterRows:
    rows: list = field(default_factory=list)
    """The Projects tab: BlueIQ's plants in file order, then the Website Only projects."""
    merged: list = field(default_factory=list)
    """(BlueIQ plant, website project) for each merged row."""
    shared: dict = field(default_factory=dict)
    """Plant ID to the website projects that name it, for plants named more than once."""
    weak: list = field(default_factory=list)
    """Website projects that merged on a match the reconciliation flags as weak."""
    review: list = field(default_factory=list)
    """The Review tab: items for BluePath to check, keyed by REVIEW_HEADERS, in check order."""


def index_website(docs):
    """Index published website projects by trimmed title, which the reconciliation uses."""
    if not isinstance(docs, list):
        raise InputError("The website file must hold a JSON array of projects.")
    by_title = {}
    for doc in docs:
        doc_id, title = doc.get("_id"), (doc.get("title") or "").strip()
        if not doc_id or not title:
            raise InputError(f"A website project lacks an _id or a title: {doc_id or title!r}.")
        if doc_id.startswith("drafts."):
            raise InputError(f"The website file holds the draft {doc_id}. Query published documents.")
        if title in by_title:
            raise InputError(f"Two website projects share the title {title!r}.")
        by_title[title] = doc
    return by_title


def _list(doc, key):
    values = [v.strip() for v in doc.get(key) or [] if isinstance(v, str) and v.strip()]
    if any(";" in v for v in values):
        raise InputError(f"{doc['title'].strip()!r} has a {key} value with a semicolon.")
    return LIST_SEPARATOR.join(values) or None


def _website_fields(doc):
    return {
        "Entity Type": _list(doc, "entity"),
        "Financing Type": _list(doc, "financing"),
        "Size ($)": doc.get("size"),
        "Technologies": _list(doc, "technologies"),
        "Website ID": doc["_id"],
    }


def _website_address(doc):
    """The website's address parts. State falls back to the website's State field (AC-8.6)."""
    street, city, state, zip_code = parse_address(doc.get("address"))
    if not state and (doc.get("state") or "").strip():
        state = state_code(doc["state"])
    return dict(zip(ADDRESS_HEADERS, (street, city, state, zip_code)))


def _state(value):
    return state_code(value) if (value or "").strip() else None


def _has_coordinates(row):
    for key in ("Latitude", "Longitude"):
        try:
            if not math.isfinite(float(row.get(key))):
                return False
        except (TypeError, ValueError):
            return False
    return True


def _one_line(text):
    return ", ".join(line.strip() for line in (text or "").splitlines() if line.strip())


def _website_project(website, name):
    doc = website.get((name or "").strip())
    if doc is None:
        raise InputError(f"The reconciliation names {name!r}, which the website file lacks.")
    return doc


def build(plants, website, matches, website_only):
    result = StarterRows()
    by_id = {}
    for p in plants:
        if p.get("Plant ID") in (None, ""):
            raise InputError(f"A BlueIQ row lacks a Plant ID: {p.get('Plant Name')!r}.")
        if p["Plant ID"] in by_id:
            raise InputError(f"BlueIQ lists Plant ID {p['Plant ID']} twice.")
        by_id[p["Plant ID"]] = p

    seen = set()

    def claim(name):
        doc = _website_project(website, name)
        if doc["_id"] in seen:
            raise InputError(f"The reconciliation lists {name.strip()!r} more than once.")
        seen.add(doc["_id"])
        return doc

    claims = {}
    for m in matches:
        doc = claim(m["Website Project Name"])
        if m["BlueIQ Plant ID"] not in by_id:
            raise InputError(f"The reconciliation names Plant ID {m['BlueIQ Plant ID']}, "
                             "which BlueIQ's file lacks.")
        claims.setdefault(m["BlueIQ Plant ID"], []).append((m, doc))

    review = {check: [] for check in REVIEW_CHECKS}

    def flag(check, row, doc, details):
        review[check].append({
            "Check": check, "Plant ID": row.get("Plant ID"), "Plant Name": row.get("Plant Name"),
            "Website Project Name": doc["title"].strip() if doc else None,
            "Website ID": doc["_id"] if doc else None,
            "Details": details, "BluePath's Answer": None,
        })

    for p in plants:
        row = {**dict.fromkeys(PROJECT_HEADERS), **{h: p.get(h) for h in BLUEIQ_HEADERS}}
        named = claims.get(p["Plant ID"], [])
        doc = None
        if len(named) > 1:
            # A plant that two projects name keeps BlueIQ's values until BluePath picks one.
            names = [m["Website Project Name"].strip() for m, _ in named]
            result.shared[p["Plant ID"]] = names
            for _, shared_doc in named:
                flag(SHARED_CHECK, p, shared_doc,
                     f"{len(names)} website projects name this plant: {', '.join(names)}. Pick the "
                     "one that belongs here. Until then, the plant keeps BlueIQ's values, and "
                     "these projects hide at the load.")
        elif named:
            [(m, doc)] = named
            row.update(_website_address(doc))
            row.update(_website_fields(doc))
            result.merged.append((p, doc))
            if WEAK_FLAG in (m.get("Flags") or ""):
                result.weak.append(m["Website Project Name"].strip())
                flag(WEAK_CHECK, p, doc, f"The reconciliation flags this match: {m['Flags']}. "
                     "Confirm that this website project belongs to this plant.")
            blueiq_state = _state(p.get("State"))
            if row["State"] != blueiq_state:
                flag(STATE_CHECK, p, doc,
                     f"The website gives {row['State'] or 'no state'}, and BlueIQ gives "
                     f"{blueiq_state or 'no state'}. The row uses the website's state.")
            if not row["City"]:
                address = _one_line(doc.get("address"))
                flag(CITY_CHECK, p, doc,
                     f'The script found no city in the website\'s address, "{address}". The '
                     "row's City stays blank until you give one." if address else "The website "
                     "project has no address, so the row's Address, City, and ZIP stay blank.")
        if not _has_coordinates(p):
            flag(COORDINATES_CHECK, p, doc,
                 "BlueIQ has no latitude or longitude for this plant. Merged rows use BlueIQ's "
                 "pin, so the project leaves the map until BlueIQ adds them." if doc else
                 "The project stays off the map until it has a latitude and a longitude.")
        if not (p.get("Project Type") or "").strip():
            flag(TYPE_CHECK, p, doc, "The map takes the category from Technologies instead. "
                 "Without either, the project stays off the map.")
        result.rows.append(row)

    for w in website_only:
        doc = claim(w["Website Project Name"])
        location = doc.get("location") or {}
        row = {
            **dict.fromkeys(PROJECT_HEADERS),
            "Project Name": doc["title"].strip(),
            "Latitude": location.get("lat"),
            "Longitude": location.get("lng"),
            **_website_address(doc),
            **_website_fields(doc),
        }
        result.rows.append(row)
        if not _has_coordinates(row):
            flag(COORDINATES_CHECK, row, doc,
                 "The project stays off the map until it has a latitude and a longitude.")
        field_state = _state(doc.get("state"))
        if row["State"] and field_state and row["State"] != field_state:
            flag(STATE_FIELD_CHECK, row, doc,
                 f"The website's address says {row['State']}, but its State field says "
                 f"{field_state}. The row uses the address's state.")

    result.review = [item for check in REVIEW_CHECKS for item in review[check]]
    return result


def check_counts(result, plants, website, website_only):
    """Confirm that every plant and every website project is accounted for (AC-8.5)."""
    problems = []
    expected = len(plants) + len(website_only)
    if len(result.rows) != expected:
        problems.append(f"The Projects tab has {len(result.rows)} rows, but {len(plants)} BlueIQ "
                        f"plants plus {len(website_only)} website-only projects make {expected}.")
    plant_rows = Counter(r["Plant ID"] for r in result.rows if r["Plant ID"] is not None)
    if plant_rows != Counter(p["Plant ID"] for p in plants):
        problems.append("The Projects tab doesn't list each BlueIQ plant exactly once.")
    placed = Counter(r["Website ID"] for r in result.rows if r["Website ID"])
    placed.update(r["Website ID"] for r in result.review if r["Check"] == SHARED_CHECK)
    titles = {doc["_id"]: title for title, doc in website.items()}
    missing = [title for doc_id, title in titles.items() if doc_id not in placed]
    repeated = [titles.get(doc_id, doc_id) for doc_id, n in placed.items() if n > 1]
    if missing:
        problems.append(f"No row or Review item holds {', '.join(missing)}.")
    if repeated:
        problems.append(f"More than one row or Review item holds {', '.join(repeated)}.")
    if problems:
        raise InputError("The counts don't reconcile. " + " ".join(problems))
    return {
        "rows": len(result.rows), "plants": len(plants), "website_only": len(website_only),
        "website": len(website), "merged": len(result.merged),
        "shared": sum(len(names) for names in result.shared.values()),
    }


def _read_tab(path, tab, required):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    try:
        if tab not in wb.sheetnames:
            raise InputError(f"{Path(path).name} has no {tab!r} tab.")
        rows = wb[tab].iter_rows(values_only=True)
        headers = [str(h).strip() if h is not None else "" for h in next(rows, ())]
        missing = [h for h in required if h not in headers]
        if missing:
            raise InputError(f"The {tab!r} tab in {Path(path).name} lacks {', '.join(missing)}.")
        return [dict(zip(headers, row)) for row in rows if any(v not in (None, "") for v in row)]
    finally:
        wb.close()


def _read_website(path):
    try:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise InputError(f"{Path(path).name} isn't valid JSON: {error}.") from error
    return index_website(data["result"] if isinstance(data, dict) and "result" in data else data)


HOW_TO_HEADING = "How to use this workbook"
COLUMNS_HEADING = "Column"


def how_to_rows(sources):
    """The How-to tab: what the workbook is, how the one-time load works, and every column."""
    return [
        (HOW_TO_HEADING, None, None),
        ("What it is", "It combines BlueIQ's plant export with the website's projects. It follows "
         "BluePath's address reconciliation. Each Projects row becomes one map project.", None),
        ("Built from", "; ".join(sources), None),
        ("Built on", date.today().isoformat(), None),
        ("Projects tab", "BlueIQ's plants come first, in the export's order. The website-only "
         "projects follow them.", None),
        ("Review tab", "Each row asks BluePath to check one item. Write your answer in the "
         "BluePath's Answer column. We then rebuild the workbook with your answers. The load "
         "never reads this tab.", None),
        ("The one-time load", "An editor loads this workbook once from Feed & imports in the "
         "Studio. The pane offers the load only while no map project has a Plant ID.", None),
        ("Before it writes", "The load shows a preview of every change and saves a backup first.",
         None),
        ("Rows with a Website ID", "Each one updates that website project with every column.",
         None),
        ("Rows without a Website ID", "Each one creates a project for its plant.", None),
        ("Projects this workbook lacks", "They hide from the map and the ticker. An editor can "
         "delete them later.", None),
        ("After the load", "BlueIQ's daily file keeps BlueIQ's columns current. A filled cell in "
         "the website's four columns replaces the value, and a blank cell keeps it. Address, "
         "City, State, and ZIP stay as loaded on rows with a Website ID.", None),
        (None, None, None),
        (COLUMNS_HEADING, "Comes from", "Notes"),
        *((header, *COLUMN_NOTES[header]) for header in PROJECT_HEADERS),
    ]


def _bold(row):
    for cell in row:
        cell.font = Font(bold=True)


def _widths(ws, widths, wrap_from=None):
    for letter, width in widths.items():
        ws.column_dimensions[letter].width = width
    if wrap_from:
        for row in ws.iter_rows(min_row=2):
            for cell in row[wrap_from:]:
                cell.alignment = Alignment(wrap_text=True, vertical="top")


def write_workbook(path, result, sources):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = PROJECTS_TAB
    ws.append(PROJECT_HEADERS)
    _bold(ws[1])
    zip_column = PROJECT_HEADERS.index("ZIP") + 1
    for row in result.rows:
        ws.append([row[h] for h in PROJECT_HEADERS])
        ws.cell(ws.max_row, zip_column).number_format = "@"
    ws.freeze_panes = "C2"

    ws = wb.create_sheet(REVIEW_TAB)
    ws.append(REVIEW_HEADERS)
    _bold(ws[1])
    for item in result.review:
        ws.append([item[h] for h in REVIEW_HEADERS])
    ws.freeze_panes = "A2"
    _widths(ws, {"A": 28, "B": 10, "C": 32, "D": 40, "E": 38, "F": 70, "G": 40}, wrap_from=5)

    ws = wb.create_sheet(HOW_TO_TAB)
    for row in how_to_rows(sources):
        ws.append(row)
        if row[0] in (HOW_TO_HEADING, COLUMNS_HEADING):
            _bold(ws[ws.max_row])
    _widths(ws, {"A": 30, "B": 60, "C": 60}, wrap_from=1)
    wb.save(path)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--blueiq", required=True, type=Path, help="BlueIQ's plant export (.xlsx)")
    parser.add_argument("--website", required=True, type=Path, help="the website's projects (.json)")
    parser.add_argument("--reconciliation", required=True, type=Path,
                        help="BluePath's address reconciliation (.xlsx)")
    parser.add_argument("--out", required=True, type=Path, help="the workbook to write (.xlsx)")
    args = parser.parse_args(argv)
    inputs = {args.blueiq.resolve(), args.website.resolve(), args.reconciliation.resolve()}
    try:
        if args.out.resolve() in inputs:
            raise InputError("The output path is one of the input files.")
        plants = _read_tab(args.blueiq, BLUEIQ_TAB, BLUEIQ_HEADERS)
        website = _read_website(args.website)
        website_only = _read_tab(args.reconciliation, WEBSITE_ONLY_TAB, ["Website Project Name"])
        result = build(plants, website,
                       _read_tab(args.reconciliation, MATCHES_TAB, MATCH_HEADERS), website_only)
        counts = check_counts(result, plants, website, website_only)
    except (InputError, OSError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    args.out.parent.mkdir(parents=True, exist_ok=True)
    write_workbook(args.out, result,
                   [args.blueiq.name, args.website.name, args.reconciliation.name])
    print(f"Wrote {counts['rows']} rows to {args.out}: {counts['plants']} BlueIQ plants and "
          f"{counts['website_only']} website-only projects.")
    print(f"Of {counts['website']} website projects, {counts['merged']} merged, "
          f"{counts['website_only']} have their own row, and {counts['shared']} share "
          f"{len(result.shared)} plants on the Review tab.")
    by_check = Counter(item["Check"] for item in result.review)
    print(f"The Review tab lists {len(result.review)} items: "
          + ", ".join(f"{by_check[c]} {c}" for c in REVIEW_CHECKS if by_check[c]) + ".")
    return 0


if __name__ == "__main__":
    sys.exit(main())
