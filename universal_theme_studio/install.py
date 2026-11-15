import frappe


def after_install():
	# Create the Single so the defaults are saved on the new site.
	doc = frappe.get_doc("Theme Settings")
	doc.save(ignore_permissions=True)
