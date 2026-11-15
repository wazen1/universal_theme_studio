import frappe


def execute():
	"""Copy each user's legacy Defaults (uts_theme / uts_mode / uts_wallpaper) into the dedicated
	Theme User Preference DocType. The legacy rows are left in place (nothing is deleted)."""
	rows = frappe.db.sql(
		"select parent, defkey, defvalue from tabDefaultValue where defkey in ('uts_theme','uts_mode','uts_wallpaper')",
		as_dict=True,
	)
	by_user = {}
	for r in rows:
		by_user.setdefault(r.parent, {})[r.defkey] = r.defvalue
	for user, d in by_user.items():
		if not frappe.db.exists("User", user) or frappe.db.exists("Theme User Preference", user):
			continue
		doc = frappe.new_doc("Theme User Preference")
		doc.user = user
		doc.theme = d.get("uts_theme") or ""
		doc.mode = d.get("uts_mode") or ""
		doc.wallpaper = d.get("uts_wallpaper") or ""
		doc.flags.ignore_permissions = True
		doc.insert()
	# defaults for the new Theme Settings fields
	stored = {r[0] for r in frappe.db.sql("select field from tabSingles where doctype='Theme Settings'")}
	for field, value in {"allow_user_fonts": 1, "default_theme_fallback": "Fiori Blue", "org_font_heading": "Same as Interface", "org_font_table": "Same as Interface", "org_font_form": "Same as Interface"}.items():
		if field not in stored:
			frappe.db.set_single_value("Theme Settings", field, value)
	frappe.clear_cache()
