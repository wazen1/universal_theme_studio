import frappe


def execute():
	"""Single DocTypes don't backfill defaults for fields added later; do it once."""
	defaults = {
		"desktop_show_welcome": 1,
		"desktop_show_clock": 1,
		"desktop_show_calendar": 1,
		"desktop_clock_format": "12-hour",
	}
	stored = {r[0] for r in frappe.db.sql("select field from tabSingles where doctype='Theme Settings'")}
	for field, value in defaults.items():
		if field not in stored:
			frappe.db.set_single_value("Theme Settings", field, value)
	frappe.clear_cache()
