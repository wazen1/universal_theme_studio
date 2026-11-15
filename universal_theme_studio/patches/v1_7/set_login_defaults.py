import frappe


def execute():
	"""Defaults for the Login Designer fields (Single DocTypes don't backfill). 'Match Organization Theme' keeps
	the current login look for sites whose organization theme is one of the original five."""
	stored = {r[0] for r in frappe.db.sql("select field from tabSingles where doctype='Theme Settings'")}
	for field, value in {
		"login_design": "Match Organization Theme",
		"login_card_position": "Design Default",
		"login_card_radius": "Theme Default",
		"login_glass": 50,
		"login_show_features": 1,
	}.items():
		if field not in stored:
			frappe.db.set_single_value("Theme Settings", field, value)
	frappe.clear_cache()
