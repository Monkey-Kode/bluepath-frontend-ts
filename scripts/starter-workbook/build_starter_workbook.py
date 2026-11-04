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
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

import openpyxl
from openpyxl.styles import Font

BLUEIQ_TAB = "Plant Locations"
MATCHES_TAB = "Address Reconciliation"
WEBSITE_ONLY_TAB = "Website Only"
PROJECTS_TAB = "Projects"

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

    for p in plants:
        row = {**dict.fromkeys(PROJECT_HEADERS), **{h: p.get(h) for h in BLUEIQ_HEADERS}}
        named = claims.get(p["Plant ID"], [])
        if len(named) > 1:
            # A plant that two projects name keeps BlueIQ's values until BluePath picks one.
            result.shared[p["Plant ID"]] = [m["Website Project Name"].strip() for m, _ in named]
        elif named:
            [(m, doc)] = named
            row.update(_website_address(doc))
            row.update(_website_fields(doc))
            result.merged.append((p, doc))
            if WEAK_FLAG in (m.get("Flags") or ""):
                result.weak.append(m["Website Project Name"].strip())
        result.rows.append(row)

    for w in website_only:
        doc = claim(w["Website Project Name"])
        location = doc.get("location") or {}
        result.rows.append({
            **dict.fromkeys(PROJECT_HEADERS),
            "Project Name": doc["title"].strip(),
            "Latitude": location.get("lat"),
            "Longitude": location.get("lng"),
            **_website_address(doc),
            **_website_fields(doc),
        })
    return result


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


def write_workbook(path, result):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = PROJECTS_TAB
    ws.append(PROJECT_HEADERS)
    for cell in ws[1]:
        cell.font = Font(bold=True)
    zip_column = PROJECT_HEADERS.index("ZIP") + 1
    for row in result.rows:
        ws.append([row[h] for h in PROJECT_HEADERS])
        ws.cell(ws.max_row, zip_column).number_format = "@"
    ws.freeze_panes = "C2"
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
        result = build(
            _read_tab(args.blueiq, BLUEIQ_TAB, BLUEIQ_HEADERS),
            _read_website(args.website),
            _read_tab(args.reconciliation, MATCHES_TAB, MATCH_HEADERS),
            _read_tab(args.reconciliation, WEBSITE_ONLY_TAB, ["Website Project Name"]),
        )
    except (InputError, OSError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    args.out.parent.mkdir(parents=True, exist_ok=True)
    write_workbook(args.out, result)
    plants = len(result.rows) - sum(1 for r in result.rows if r["Plant ID"] is None)
    print(f"Wrote {len(result.rows)} rows to {args.out}: {plants} BlueIQ plants, "
          f"{len(result.merged)} merged with a website project, "
          f"{len(result.rows) - plants} website-only, and {len(result.shared)} shared plants.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
