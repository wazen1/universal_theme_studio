import frappe


def execute():
	"""Create the five per-theme sidebar rows on existing sites."""
	doc = frappe.get_doc("Theme Settings")
	doc.save(ignore_permissions=True)  # validate() fills the missing rows
