import frappe


def execute():
	"""Initialise the Financial Report Printing settings (Oracle Classic, A4 landscape, Tajawal, auto language)."""
	frappe.reload_doc("universal_theme_studio", "doctype", "print_designer_settings")
	frappe.reload_doc("universal_theme_studio", "doctype", "report_print_preference")
	doc = frappe.get_doc("Print Designer Settings")
	defaults = {
		"reports_enabled": 1, "reports_all": 0, "report_style": "Oracle Classic", "report_page_size": "A4",
		"report_orientation": "Landscape", "report_font": "Tajawal", "report_language": "Auto (follow interface language)",
		"report_show_logo": 1, "report_show_user": 1, "report_show_date": 1, "report_show_rownum": 0, "report_allow_user_prefs": 1,
	}
	# these fields did not exist before this version, so nothing of the administrator's is overwritten
	for k, v in defaults.items():
		doc.set(k, v)
	doc.save(ignore_permissions=True)
