import frappe


def execute():
	"""Login language default (Arabic) for existing sites; Single DocTypes don't backfill new fields."""
	stored = {r[0] for r in frappe.db.sql("select field from tabSingles where doctype='Theme Settings'")}
	if "login_default_language" not in stored:
		frappe.db.set_single_value("Theme Settings", "login_default_language", "Arabic")
	frappe.clear_cache()
