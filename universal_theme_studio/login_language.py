"""Default language of the login page (before_request hook).

Frappe picks a guest's language from ?_lang=, the preferred_language cookie and the browser's Accept-Language, in that order.
This only fills the gap: when none of the first two is set, /login uses the language chosen in Theme Settings
(default Arabic). A visitor's own choice (the page's language switcher sets the cookie) always wins."""

import frappe


def default_language():
	req = getattr(frappe.local, "request", None)
	if req is None or req.path.rstrip("/") != "/login" or frappe.session.user != "Guest":
		return
	if frappe.form_dict.get("_lang") or req.cookies.get("preferred_language"):
		return
	choice = frappe.get_cached_doc("Theme Settings").get("login_default_language")
	code = {"Arabic": "ar", "English": "en"}.get(choice)
	if code and frappe.db.get_value("Language", code, "enabled"):
		frappe.local.lang = code
