import frappe
from frappe.core.doctype.navbar_settings.navbar_settings import get_app_logo


def get_context(context):
	"""Admin-only, inert stand-in for /login used by the Theme Settings live preview (a signed-in admin cannot
	open the real /login: Frappe redirects authenticated users to the desk). It reuses Frappe's login stylesheet and
	card markup but has no handlers, no forms that submit and no data."""
	frappe.only_for("System Manager")
	context.no_cache = 1
	context.no_header = True
	context.show_sidebar = False
	context.logo = get_app_logo()
