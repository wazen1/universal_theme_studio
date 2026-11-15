"""Defense in depth for Theme User Preference: only the owner (via the whitelisted API) or a System Manager."""

import frappe


def _is_admin(user):
	return "System Manager" in frappe.get_roles(user)


def has_permission(doc, ptype=None, user=None):
	user = user or frappe.session.user
	if _is_admin(user):
		return None
	return False if doc.user != user else None


def query_conditions(user=None):
	user = user or frappe.session.user
	if _is_admin(user):
		return ""
	return f"`tabTheme User Preference`.`user` = {frappe.db.escape(user)}"


def pref_has_permission(doc, ptype=None, user=None):
	"""Report Print Preference: owner or System Manager (same rule as Theme User Preference)."""
	return has_permission(doc, ptype, user)


def pref_query_conditions(user=None):
	user = user or frappe.session.user
	if _is_admin(user):
		return ""
	return f"`tabReport Print Preference`.`user` = {frappe.db.escape(user)}"
