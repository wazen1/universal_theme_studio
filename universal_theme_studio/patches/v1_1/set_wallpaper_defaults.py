import frappe


def execute():
	"""Single DocTypes don't backfill defaults for fields added later; do it once."""
	defaults = {
		"desktop_wallpaper_enabled": 1,
		"desktop_glass_cards": 1,
		"desktop_glass_opacity": 35,
		"desktop_wallpaper_fit": "Cover",
		"desktop_wallpaper_position": "Center",
		"desktop_overlay": 25,
		"desktop_blur": 0,
	}
	stored = {
		r[0]
		for r in frappe.db.sql(
			"select field from tabSingles where doctype='Theme Settings'"
		)
	}
	for field, value in defaults.items():
		if field not in stored:
			frappe.db.set_single_value("Theme Settings", field, value)
	frappe.clear_cache()
