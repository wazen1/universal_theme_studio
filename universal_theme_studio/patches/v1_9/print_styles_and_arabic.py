import frappe


def execute():
	"""Add the six designs to the print view's Style list and make Arabic the default print language."""
	from universal_theme_studio.print_studio import provision

	frappe.reload_doc("universal_theme_studio", "doctype", "print_designer_settings")
	provision.ensure_print_styles()
	doc = frappe.get_doc("Print Designer Settings")
	if (doc.language_mode or "").startswith("Auto"):
		doc.language_mode = "Arabic"
		doc.save(ignore_permissions=True)
