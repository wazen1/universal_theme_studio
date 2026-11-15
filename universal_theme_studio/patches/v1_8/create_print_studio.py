import frappe


def execute():
	"""Create the Print Designer Settings defaults and the 'Print Studio - <DocType>' Print Formats (additive only)."""
	from universal_theme_studio.print_studio import provision

	frappe.reload_doc("universal_theme_studio", "doctype", "print_design_assignment")
	frappe.reload_doc("universal_theme_studio", "doctype", "print_designer_settings")
	doc = frappe.get_doc("Print Designer Settings")
	doc.save(ignore_permissions=True)
	provision.ensure_all()
