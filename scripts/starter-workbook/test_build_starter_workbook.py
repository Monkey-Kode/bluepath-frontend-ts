"""Tests for build_starter_workbook.py (AC-8.1 to AC-8.6).

Run from bluepath-frontend-ts:
    uv run --no-project --with openpyxl --with pytest python -I -B -m pytest -p no:cacheprovider scripts/starter-workbook
"""

import importlib.util
import json
from pathlib import Path

import openpyxl
import pytest

SCRIPT = Path(__file__).with_name("build_starter_workbook.py")
_spec = importlib.util.spec_from_file_location("build_starter_workbook", SCRIPT)
starter = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(starter)


def plant(plant_id, name, **values):
    row = dict.fromkeys(starter.BLUEIQ_HEADERS)
    row.update({
        "Plant ID": plant_id, "Plant Name": name, "Project ID": plant_id // 10,
        "Project Name": name, "Project Type": "Solar", "Technology (BlueIQ value)": "Solar",
        "Project Status": "Operating", "Active": "Yes", "Latitude": 35.0, "Longitude": -94.0,
    })
    row.update(values)
    return row


WELLS = plant(1032, "111 Wells", **{
    "Project ID": 106, "Latitude": 42.2933, "Longitude": -71.2047,
    "Address": "Helen Heyn Riverway (Blue Heron)", "City": "Newton", "State": "MA",
    "ZIP": "02158", "County": "Middlesex County",
})
FORT_SMITH = plant(1077, "Fort Smith", **{
    "Address": "4813 Arkansas 22", "City": "Subiaco", "State": "AR", "ZIP": "72855",
    "County": "Logan County",
})
SHARED = plant(2001, "Riverside Solar", Address="1 River Rd", City="Riverside", State="CA",
               ZIP="92501")
ALONE = plant(2002, "Lone Pine", Address="9 Pine St", City="Lone Pine", State="CA", ZIP="93545")
PLANTS = [WELLS, FORT_SMITH, SHARED, ALONE]

DOCS = [
    {"_id": "web-wells", "title": "111 Wells (Newton)",
     "address": "111 Wells Ave, Newton, Massachusetts 02459", "state": "Massachusetts",
     "location": {"lat": 42.33, "lng": -71.21}, "entity": ["Commercial & Industrial  "],
     "financing": ["PPA", ""], "size": 1500000, "technologies": ["Solar", "Battery Storage "]},
    {"_id": "web-fort-smith", "title": "City of Fort Smith ", "address": "Fort Smith, AR",
     "state": "Arkansas", "location": {"lat": 35.39, "lng": -94.4}, "entity": ["Municipal"],
     "financing": None, "size": 250000, "technologies": ["solar"]},
    {"_id": "web-river-a", "title": "Riverside School", "address": "", "state": "California",
     "entity": ["K-12"], "size": 10, "technologies": ["Solar"]},
    {"_id": "web-river-b", "title": "Riverside College", "address": "", "state": "California",
     "entity": ["University"], "size": 20, "technologies": ["Solar"]},
    {"_id": "web-manhattan", "title": "Manhattan Condominiums",
     "address": "700 E 8th St\nKansas City, Missouri 64106", "state": "Kansas",
     "location": {"_type": "geopoint", "lat": 39.218, "lng": -94.558},
     "entity": ["Multi-Family"], "financing": ["Cash"], "size": 75000,
     "technologies": ["Lighting", "HVAC"]},
    {"_id": "web-lakeside", "title": "Lakeside School", "address": "12 Main St", "state": "Ohio",
     "location": None, "entity": None, "size": None, "technologies": None},
]
MATCHES = [
    {"Website Project Name": "111 Wells (Newton)", "BlueIQ Plant ID": 1032,
     "Flags": "Map pins 7.5 km apart; ZIP differs"},
    {"Website Project Name": "City of Fort Smith", "BlueIQ Plant ID": 1077,
     "Flags": "Weak project match, confirm; City differs"},
    {"Website Project Name": "Riverside School", "BlueIQ Plant ID": 2001, "Flags": None},
    {"Website Project Name": "Riverside College", "BlueIQ Plant ID": 2001, "Flags": None},
]
WEBSITE_ONLY = [
    {"Website Project Name": "Manhattan Condominiums"},
    {"Website Project Name": "Lakeside School"},
]


def build(plants=PLANTS, docs=DOCS, matches=MATCHES, website_only=WEBSITE_ONLY):
    return starter.build(plants, starter.index_website(docs), matches, website_only)


def row_for(result, **match):
    found = [r for r in result.rows if all(r[k] == v for k, v in match.items())]
    assert len(found) == 1, found
    return found[0]


class TestParseAddress:
    @pytest.mark.parametrize("raw, parts", [
        ("111 Wells Ave, Newton, Massachusetts 02459", ("111 Wells Ave", "Newton", "MA", "02459")),
        ("Fort Smith, AR", (None, "Fort Smith", "AR", None)),
        ("310 W 49th St\t\nKansas City, Missouri 64112",
         ("310 W 49th St", "Kansas City", "MO", "64112")),
        ("12 Main St", ("12 Main St", None, None, None)),
        ("1200 N Elm Dr, Lake Oswego OR 97034-1234", ("1200 N Elm Dr", "Lake Oswego", "OR", "97034")),
        ("", (None, None, None, None)),
        (None, (None, None, None, None)),
    ])
    def test_splits_the_website_address(self, raw, parts):
        assert starter.parse_address(raw) == parts

    @pytest.mark.parametrize("name, code", [
        ("Massachusetts", "MA"), (" kansas ", "KS"), ("Ill", "IL"), ("ar", "AR"),
    ])
    def test_state_code(self, name, code):
        assert starter.state_code(name) == code


class TestPlantRows:
    """AC-8.1: every plant once, BlueIQ's 15 columns, then the five added columns."""

    def test_projects_tab_columns(self):
        assert starter.PROJECT_HEADERS == starter.BLUEIQ_HEADERS + [
            "Entity Type", "Financing Type", "Size ($)", "Technologies", "Website ID",
        ]
        assert len(starter.BLUEIQ_HEADERS) == 15

    def test_every_plant_appears_once_in_blueiq_order(self):
        ids = [r["Plant ID"] for r in build().rows if r["Plant ID"] is not None]
        assert ids == [1032, 1077, 2001, 2002]

    def test_a_plant_without_a_website_project_keeps_every_blueiq_value(self):
        row = row_for(build(), **{"Plant ID": 2002})
        assert {h: row[h] for h in starter.BLUEIQ_HEADERS} == ALONE
        assert all(row[h] is None for h in starter.WEBSITE_HEADERS)


class TestMergedRows:
    """AC-8.2 and AC-8.6: a matched website project merges into the plant it names."""

    def test_111_wells_takes_the_website_address(self):
        row = row_for(build(), **{"Plant ID": 1032})
        assert (row["Address"], row["City"], row["State"], row["ZIP"]) == (
            "111 Wells Ave", "Newton", "MA", "02459",
        )

    def test_fort_smith_never_mixes_in_blueiq_address_parts(self):
        row = row_for(build(), **{"Plant ID": 1077})
        assert (row["Address"], row["City"], row["State"], row["ZIP"]) == (
            None, "Fort Smith", "AR", None,
        )

    def test_state_falls_back_to_the_website_state_field(self):
        docs = [dict(DOCS[0], address="111 Wells Ave, Newton")] + DOCS[1:]
        row = row_for(build(docs=docs), **{"Plant ID": 1032})
        assert (row["City"], row["State"]) == ("Newton", "MA")

    def test_a_merged_row_gains_the_website_fields_and_id(self):
        row = row_for(build(), **{"Plant ID": 1032})
        assert {h: row[h] for h in starter.WEBSITE_HEADERS} == {
            "Entity Type": "Commercial & Industrial",
            "Financing Type": "PPA",
            "Size ($)": 1500000,
            "Technologies": "Solar; Battery Storage",
            "Website ID": "web-wells",
        }

    def test_blueiq_values_win_everywhere_else(self):
        row = row_for(build(), **{"Plant ID": 1032})
        kept = [h for h in starter.BLUEIQ_HEADERS if h not in starter.ADDRESS_HEADERS]
        assert {h: row[h] for h in kept} == {h: WELLS[h] for h in kept}

    def test_a_weak_match_merges_and_is_reported(self):
        result = build()
        assert row_for(result, **{"Plant ID": 1077})["Website ID"] == "web-fort-smith"
        assert result.weak == ["City of Fort Smith"]

    def test_a_shared_plant_keeps_blueiq_values_and_reports_both_projects(self):
        result = build()
        row = row_for(result, **{"Plant ID": 2001})
        assert {h: row[h] for h in starter.BLUEIQ_HEADERS} == SHARED
        assert all(row[h] is None for h in starter.WEBSITE_HEADERS)
        assert result.shared == {2001: ["Riverside School", "Riverside College"]}
        assert not any(r["Website ID"] in ("web-river-a", "web-river-b") for r in result.rows)

    def test_merged_pairs_name_the_plant_and_the_website_project(self):
        pairs = [(p["Plant ID"], d["_id"]) for p, d in build().merged]
        assert pairs == [(1032, "web-wells"), (1077, "web-fort-smith")]


class TestWebsiteOnlyRows:
    """AC-8.3: each Website Only project becomes its own row, and the script guesses nothing."""

    def test_rows_follow_the_plants_in_tab_order(self):
        names = [r["Project Name"] for r in build().rows[len(PLANTS):]]
        assert names == ["Manhattan Condominiums", "Lakeside School"]

    def test_a_website_only_row_takes_the_website_values(self):
        row = row_for(build(), **{"Website ID": "web-manhattan"})
        assert row == {
            **dict.fromkeys(starter.BLUEIQ_HEADERS),
            "Project Name": "Manhattan Condominiums",
            "Latitude": 39.218, "Longitude": -94.558,
            "Address": "700 E 8th St", "City": "Kansas City", "State": "MO", "ZIP": "64106",
            "Entity Type": "Multi-Family", "Financing Type": "Cash", "Size ($)": 75000,
            "Technologies": "Lighting; HVAC", "Website ID": "web-manhattan",
        }

    def test_missing_website_values_stay_blank(self):
        row = row_for(build(), **{"Website ID": "web-lakeside"})
        assert (row["Address"], row["City"], row["State"], row["ZIP"]) == (
            "12 Main St", None, "OH", None,
        )
        assert (row["Latitude"], row["Longitude"]) == (None, None)
        assert all(row[h] is None for h in ("Entity Type", "Size ($)", "Technologies"))


class TestInputErrors:
    def test_an_unknown_website_name(self):
        matches = MATCHES + [{"Website Project Name": "Nowhere", "BlueIQ Plant ID": 2002}]
        with pytest.raises(starter.InputError, match="Nowhere"):
            build(matches=matches)

    def test_an_unknown_plant_id(self):
        matches = MATCHES[:1] + [dict(MATCHES[1], **{"BlueIQ Plant ID": 9999})]
        with pytest.raises(starter.InputError, match="9999"):
            build(matches=matches)

    def test_a_website_project_on_both_tabs(self):
        with pytest.raises(starter.InputError, match="Lakeside School"):
            build(website_only=WEBSITE_ONLY + [{"Website Project Name": "Lakeside School"}])

    def test_a_repeated_plant_id(self):
        with pytest.raises(starter.InputError, match="1032"):
            build(plants=PLANTS + [WELLS])

    def test_a_draft_website_project(self):
        with pytest.raises(starter.InputError, match="drafts.web-x"):
            starter.index_website(DOCS + [{"_id": "drafts.web-x", "title": "Draft"}])

    def test_a_repeated_website_title(self):
        with pytest.raises(starter.InputError, match="Lakeside School"):
            starter.index_website(DOCS + [dict(DOCS[-1], _id="web-other")])

    def test_a_list_value_with_the_separator(self):
        docs = DOCS[:-1] + [dict(DOCS[-1], technologies=["Solar; Storage"])]
        with pytest.raises(starter.InputError, match="Lakeside School"):
            build(docs=docs)


def review_of(result):
    return [(r["Check"], r["Plant ID"], r["Website ID"]) for r in result.review]


def item_for(result, check):
    found = [r for r in result.review if r["Check"] == check]
    assert len(found) == 1, found
    return found[0]


class TestReviewTab:
    """AC-8.4: the Review tab lists each item for BluePath to check, grouped by check."""

    def test_lists_the_fixture_items_in_check_order(self):
        assert review_of(build()) == [
            ("Shares a plant", 2001, "web-river-a"),
            ("Shares a plant", 2001, "web-river-b"),
            ("Weak match", 1077, "web-fort-smith"),
            ("No coordinates", None, "web-lakeside"),
            ("Address and State field differ", None, "web-manhattan"),
        ]

    def test_every_item_leaves_the_answer_blank(self):
        result = build()
        assert all(list(r) == starter.REVIEW_HEADERS for r in result.review)
        assert all(r["BluePath's Answer"] is None for r in result.review)

    def test_a_shared_plant_names_both_projects_and_what_happens_at_the_load(self):
        item = build().review[0]
        assert item["Plant Name"] == "Riverside Solar"
        assert item["Website Project Name"] == "Riverside School"
        assert "Riverside College" in item["Details"] and "hide" in item["Details"]

    def test_a_weak_match_repeats_the_reconciliation_flag(self):
        item = item_for(build(), "Weak match")
        assert "Weak project match, confirm" in item["Details"]

    def test_a_merged_state_that_differs_from_blueiq(self):
        docs = [DOCS[0], dict(DOCS[1], address="Fort Smith, OK")] + DOCS[2:]
        item = item_for(build(docs=docs), "State differs from BlueIQ")
        assert (item["Plant ID"], item["Website ID"]) == (1077, "web-fort-smith")
        assert "OK" in item["Details"] and "AR" in item["Details"]

    def test_a_merged_row_without_any_website_state(self):
        docs = [DOCS[0], dict(DOCS[1], address="", state=None)] + DOCS[2:]
        item = item_for(build(docs=docs), "State differs from BlueIQ")
        assert item["Plant ID"] == 1077

    def test_a_merged_row_without_a_city(self):
        docs = [dict(DOCS[0], address="111 Wells Ave\n")] + DOCS[1:]
        item = item_for(build(docs=docs), "No city")
        assert (item["Plant ID"], item["Website ID"]) == (1032, "web-wells")
        assert "111 Wells Ave" in item["Details"]

    def test_a_plant_without_coordinates(self):
        plants = PLANTS[:3] + [dict(ALONE, Latitude=None)]
        assert ("No coordinates", 2002, None) in review_of(build(plants=plants))

    def test_a_merged_plant_without_coordinates_says_it_leaves_the_map(self):
        plants = [dict(WELLS, Longitude="")] + PLANTS[1:]
        result = build(plants=plants)
        [item] = [r for r in result.review if r["Plant ID"] == 1032]
        assert (item["Check"], item["Website ID"]) == ("No coordinates", "web-wells")
        assert "BlueIQ's pin" in item["Details"]
        assert row_for(result, **{"Plant ID": 1032})["Longitude"] == ""

    def test_a_plant_without_a_project_type(self):
        plants = PLANTS[:3] + [dict(ALONE, **{"Project Type": "  "})]
        assert ("No Project Type", 2002, None) in review_of(build(plants=plants))

    def test_website_only_rows_never_need_a_project_type(self):
        assert not any(r["Check"] == "No Project Type" for r in build().review)

    def test_an_address_state_that_differs_from_the_state_field(self):
        item = item_for(build(), "Address and State field differ")
        assert "MO" in item["Details"] and "KS" in item["Details"]


class TestHowToTab:
    """AC-8.4: the How-to tab explains every column and the one-time load."""

    def test_explains_every_projects_column(self):
        columns = [row[0] for row in starter.how_to_rows([]) if row[0] in starter.PROJECT_HEADERS]
        assert columns == starter.PROJECT_HEADERS

    def test_names_the_input_files(self):
        text = " ".join(str(v) for row in starter.how_to_rows(["blueiq.xlsx"]) for v in row)
        assert "blueiq.xlsx" in text and "Feed & imports" in text


class TestCountCheck:
    """AC-8.5: the counts reconcile, or the script writes nothing."""

    def test_the_fixture_counts_reconcile(self):
        counts = starter.check_counts(build(), PLANTS, starter.index_website(DOCS), WEBSITE_ONLY)
        assert counts == {
            "rows": 6, "plants": 4, "website_only": 2, "website": 6, "merged": 2, "shared": 2,
        }

    def test_a_website_project_that_the_reconciliation_lacks(self):
        docs = DOCS + [{"_id": "web-hilltop", "title": "Hilltop Library"}]
        with pytest.raises(starter.InputError, match="Hilltop Library"):
            starter.check_counts(build(docs=docs), PLANTS, starter.index_website(docs), WEBSITE_ONLY)

    def test_a_lost_plant_row(self):
        result = build()
        result.rows.pop(0)
        with pytest.raises(starter.InputError, match="rows"):
            starter.check_counts(result, PLANTS, starter.index_website(DOCS), WEBSITE_ONLY)

    def test_a_website_project_on_two_rows(self):
        result = build()
        result.rows[-2] = dict(result.rows[-1])
        with pytest.raises(starter.InputError, match="Lakeside School.*Manhattan Condominiums|Manhattan Condominiums.*Lakeside School"):
            starter.check_counts(result, PLANTS, starter.index_website(DOCS), WEBSITE_ONLY)


def write_xlsx(path, tabs):
    wb = openpyxl.Workbook()
    wb.remove(wb.active)
    for title, (headers, rows) in tabs.items():
        ws = wb.create_sheet(title)
        ws.append(headers)
        for row in rows:
            ws.append([row.get(h) for h in headers])
    wb.save(path)


class TestCommandLine:
    @pytest.fixture
    def inputs(self, tmp_path):
        blueiq = tmp_path / "blueiq.xlsx"
        write_xlsx(blueiq, {"Plant Locations": (starter.BLUEIQ_HEADERS, PLANTS)})
        reconciliation = tmp_path / "reconciliation.xlsx"
        write_xlsx(reconciliation, {
            "Address Reconciliation": (["Website Project Name", "BlueIQ Plant ID", "Flags"], MATCHES),
            "Website Only": (["Website Project Name", "City"], WEBSITE_ONLY),
        })
        website = tmp_path / "website.json"
        website.write_text(json.dumps({"result": DOCS}))
        return {"blueiq": blueiq, "website": website, "reconciliation": reconciliation,
                "out": tmp_path / "out" / "starter.xlsx"}

    def args(self, inputs):
        return [f"--{k}={v}" for k, v in inputs.items()]

    def test_writes_the_projects_tab(self, inputs, capsys):
        assert starter.main(self.args(inputs)) == 0
        ws = openpyxl.load_workbook(inputs["out"])["Projects"]
        rows = list(ws.iter_rows(values_only=True))
        assert list(rows[0]) == starter.PROJECT_HEADERS
        assert len(rows) == 1 + len(PLANTS) + len(WEBSITE_ONLY)
        zip_column = starter.PROJECT_HEADERS.index("ZIP")
        assert rows[1][zip_column] == "02459"
        assert "6 rows" in capsys.readouterr().out

    def test_a_bad_input_writes_nothing(self, inputs, capsys):
        write_xlsx(inputs["blueiq"], {"Plant Locations": (["Plant ID"], [])})
        assert starter.main(self.args(inputs)) == 1
        assert "Plant Name" in capsys.readouterr().err
        assert not inputs["out"].exists()

    def test_refuses_to_overwrite_an_input(self, inputs, capsys):
        inputs["out"] = inputs["blueiq"]
        assert starter.main(self.args(inputs)) == 1
        assert "input" in capsys.readouterr().err

    def test_writes_the_review_and_how_to_tabs(self, inputs):
        assert starter.main(self.args(inputs)) == 0
        wb = openpyxl.load_workbook(inputs["out"])
        assert wb.sheetnames == ["Projects", "Review", "How-to"]
        review = list(wb["Review"].iter_rows(values_only=True))
        assert list(review[0]) == starter.REVIEW_HEADERS
        assert [row[0] for row in review[1:]] == [r[0] for r in review_of(build())]
        how_to = " ".join(str(v) for row in wb["How-to"].iter_rows(values_only=True) for v in row)
        assert "blueiq.xlsx" in how_to

    def test_counts_that_do_not_reconcile_write_nothing(self, inputs, capsys):
        docs = DOCS + [{"_id": "web-hilltop", "title": "Hilltop Library"}]
        inputs["website"].write_text(json.dumps(docs))
        assert starter.main(self.args(inputs)) == 1
        assert "Hilltop Library" in capsys.readouterr().err
        assert not inputs["out"].exists()
