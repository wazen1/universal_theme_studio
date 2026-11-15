"""Server side of Oracle-style report printing.

The report itself is rendered in the browser from the data the user's own report run already returned (so permissions
and values are exactly ERPNext's). This module only supplies: organization defaults, the user's own preferences,
and the company block (name, logo, tax id, address) for the header."""

import json

import frappe
from frappe import _

from universal_theme_studio.print_studio import settings as S

STYLES = ("Oracle Classic", "Oracle Modern", "Audit Ledger", "Standard (Frappe)")
PAGE_SIZES = ("A4", "A3")
ORIENTATIONS = ("Landscape", "Portrait")
FONTS = ("Tajawal", "Cairo")
LANGS = {"Auto (follow interface language)": "auto", "Arabic": "ar", "English": "en"}
PREF_FIELDS = ("report_style", "page_size", "orientation", "font", "show_rownum")


def _org():
	s = frappe.get_cached_doc("Print Designer Settings")
	return {
		"enabled": int(s.reports_enabled if s.reports_enabled is not None else 1),
		"all_reports": int(s.reports_all or 0),
		"style": s.report_style if s.report_style in STYLES else "Oracle Classic",
		"page_size": s.report_page_size if s.report_page_size in PAGE_SIZES else "A4",
		"orientation": s.report_orientation if s.report_orientation in ORIENTATIONS else "Landscape",
		"font": s.report_font if s.report_font in FONTS else "Tajawal",
		"lang": LANGS.get(s.report_language, "auto"),
		"show_logo": int(s.report_show_logo if s.report_show_logo is not None else 1),
		"show_user": int(s.report_show_user if s.report_show_user is not None else 1),
		"show_date": int(s.report_show_date if s.report_show_date is not None else 1),
		"show_rownum": int(s.report_show_rownum or 0),
		"allow_prefs": int(s.report_allow_user_prefs if s.report_allow_user_prefs is not None else 1),
	}


def _user_pref(org):
	if not org["allow_prefs"] or frappe.session.user == "Guest":
		return {}
	row = frappe.db.get_value("Report Print Preference", frappe.session.user, list(PREF_FIELDS), as_dict=True) or {}
	out = {}
	if row.get("report_style") in STYLES:
		out["style"] = row["report_style"]
	if row.get("page_size") in PAGE_SIZES:
		out["page_size"] = row["page_size"]
	if row.get("orientation") in ORIENTATIONS:
		out["orientation"] = row["orientation"]
	if row.get("font") in FONTS:
		out["font"] = row["font"]
	if row.get("show_rownum") in ("Yes", "No"):
		out["show_rownum"] = 1 if row["show_rownum"] == "Yes" else 0
	return out


def boot_payload():
	org = _org()
	return {"org": org, "user": _user_pref(org)}


@frappe.whitelist()
def get_settings():
	return boot_payload()


@frappe.whitelist(methods=["POST"])
def save_preference(report_style=None, page_size=None, orientation=None, font=None, show_rownum=None):
	"""Own preference only (the row name is always the session user). Every value is checked against fixed lists."""
	org = _org()
	if not org["allow_prefs"]:
		frappe.throw(_("Your administrator has disabled personal report printing preferences"), frappe.PermissionError)
	vals = {}
	if report_style is not None:
		vals["report_style"] = report_style if report_style in STYLES else ""
	if page_size is not None:
		vals["page_size"] = page_size if page_size in PAGE_SIZES else ""
	if orientation is not None:
		vals["orientation"] = orientation if orientation in ORIENTATIONS else ""
	if font is not None:
		vals["font"] = font if font in FONTS else ""
	if show_rownum is not None:
		vals["show_rownum"] = {"1": "Yes", "0": "No", 1: "Yes", 0: "No"}.get(show_rownum, "")
	user = frappe.session.user
	if frappe.db.exists("Report Print Preference", user):
		doc = frappe.get_doc("Report Print Preference", user)
	else:
		doc = frappe.new_doc("Report Print Preference")
		doc.user = user
	doc.update(vals)
	doc.flags.ignore_permissions = True
	doc.save()
	return boot_payload()


@frappe.whitelist(methods=["POST"])
def reset_preference():
	if frappe.db.exists("Report Print Preference", frappe.session.user):
		frappe.delete_doc("Report Print Preference", frappe.session.user, ignore_permissions=True)
	return boot_payload()


def _is_financial(report_name):
	"""Reports of the Accounts module (and any report when the administrator chose 'all reports')."""
	org = _org()
	if not org["enabled"]:
		return False
	if org["all_reports"]:
		return True
	return frappe.db.get_value("Report", report_name, "module") == "Accounts"


@frappe.whitelist()
def report_context(report_name, company=None):
	"""Header data for a report the user can already open. Returns only what the user may read."""
	if not frappe.has_permission("Report", "read", doc=report_name):
		frappe.throw(_("Not permitted"), frappe.PermissionError)
	ctx = {"applies": int(_is_financial(report_name)), "company": {}}
	company = company or frappe.defaults.get_user_default("Company")
	if company and frappe.db.exists("Company", company) and frappe.has_permission("Company", "read", doc=company):
		row = frappe.db.get_value(
			"Company", company, ["company_name", "company_logo", "tax_id", "default_currency", "phone_no", "email", "website"], as_dict=True
		)
		logo = row.company_logo or ""
		if logo and not S.safe_url(logo):
			logo = ""
		ctx["company"] = {
			"name": row.company_name or company,
			"logo": logo,
			"tax_id": row.tax_id or "",
			"currency": row.default_currency or "",
			"phone": row.phone_no or "",
			"email": row.email or "",
			"website": row.website or "",
		}
		try:
			from frappe.contacts.doctype.address.address import get_default_address, get_address_display

			addr = get_default_address("Company", company)
			if addr:
				ctx["company"]["address"] = frappe.utils.strip_html(get_address_display(addr)).replace("\n", " · ")
		except Exception:
			pass
	ctx["user"] = {"full_name": frappe.utils.get_fullname(), "id": frappe.session.user}
	return ctx
