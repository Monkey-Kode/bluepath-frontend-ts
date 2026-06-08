# Task: Impact page Redesign

The current impact page has been given a complete redesign. While the data stays the same the layout is entirely different.

## Design

It's a brand new design, so we will need to rebuild this page from scratch.

## Carbon Offsets

This is the most drastic change and may require changing/simplifying the schema in Sanity. Currently, this has many icons/text hexagons that are repeatable blocks that get laid out in the page in a hive design. The new design is much simpler.

- New design, puts each icon aligned horizontally with text below it. Text data changes, when you click on the tabbed text below the heading. Each icon has their own text assigned to it.
- We can reuse our repeatable blocks, but not all the data props are going to be used, like background

### Design

Landing Page: @.claude/prompts/feat/impact-redesign/assets/IMPACT-ICONS .jpg
Clicking on first text tab: @.claude/prompts/feat/impact-redesign/assets/IMPACT-tab-data-under-icons-project-life-tab.jpg
Clicking on second text tab: @.claude/prompts/feat/impact-redesign/assets/IMPACT-tab-data-under-icons-useful-life-tab.jpg

## Environmental Impact

This also is a new design. The data stays the same, as we have text that belongs to each icon, but it is laid out differently. Like Carbon Offsets, the design is simpler. We start with our icons laid out horizontally. When you click on an icon, the 3 icons to the right of the first one disappear and get replaced with the text of the icon clicked. The first icon, gets replaced by the icon the was clicked.

## Animation

All the icons interactions need to have beautiful fade in/out bounce animations using motion.

## Mobile

The mobile design is simpler now, icons stacked at 2 columns.
