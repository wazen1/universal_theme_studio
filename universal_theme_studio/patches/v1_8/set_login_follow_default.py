import frappe


def execute():
	stored = {r[0] for r in frappe.db.sql("select field from tabSingles where doctype='Theme Settings'")}
	if "login_follow_user_theme" not in stored:
		frappe.db.set_single_value("Theme Settings", "login_follow_user_theme", 1)
	frappe.clear_cache()
