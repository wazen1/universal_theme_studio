import frappe


def execute():
	"""Additive: add the six new sidebar rows (existing rows are kept) and defaults for new fields."""
	defaults = {"glass_transparency": 50, "allow_user_wallpaper": 1, "desktop_wallpaper_preset": "Theme Default", "gradient_direction": "Theme Default", "sidebar_gradient": "Theme Default"}
	stored = {r[0] for r in frappe.db.sql("select field from tabSingles where doctype='Theme Settings'")}
	for field, value in defaults.items():
		if field not in stored:
			frappe.db.set_single_value("Theme Settings", field, value)
	doc = frappe.get_doc("Theme Settings")
	doc.save(ignore_permissions=True)  # validate() appends only the missing sidebar rows
	frappe.clear_cache()
