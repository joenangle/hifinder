# HiFinder Data Directory

This directory contains reference data files used for database population and imports.

## Structure

### `crinacle/`
Expert data exported from Crinacle's headphone/IEM ranking lists.
- Various CSV exports from different dates
- Used with `scripts/merge-crinacle-cans.js` and `scripts/import-crinacle-data.js`

### `imports/`
Component specification files for bulk imports.
- `amps-to-populate.csv` - Amplifier specifications
- `headphone-specs-import.csv` - Headphone technical specs

## Usage

These files are reference data only. Import scripts in `/scripts` use these files to populate the database.

**Do not modify these files directly in production workflows.**
