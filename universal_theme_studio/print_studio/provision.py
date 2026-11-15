"""Creates/maintains the 'Print Studio - <DocType>' Print Formats and the per-DocType default print format.

Only our own records are ever written: existing Print Formats (standard or custom) are never modified. A DocType's
default print format is changed only through a Property Setter and only when the administrator ticks 'Default
Print Format' for it; the previous default is remembered and restored when it is unticked."""

import frappe

from universal_theme_studio.print_studio import config as C

PF_HTML = "{{ uts_print(doc) }}"


def pf_name(doctype):
	return f"{C.PRINT_FORMAT_PREFIX}{doctype}"


def ensure_print_format(doctype):
	name = pf_name(doctype)
	if frappe.db.exists("Print Format", name):
		pf = frappe.get_doc("Print Format", name)
		if pf.html != PF_HTML or pf.disabled:
			pf.html, pf.disabled = PF_HTML, 0
			pf.save(ignore_permissions=True)
		return name
	frappe.get_doc(
		{
			"doctype": "Print Format",
			"name": name,
			"doc_type": doctype,
			"print_format_type": "Jinja",
			"custom_format": 1,
			"standard": "No",
			"html": PF_HTML,
			"page_number": "Bottom Center",
			"disabled": 0,
		}
	).insert(ignore_permissions=True)
	return name


def ensure_print_styles():
	"""One Print Style per design so the designs show in the print view's Style list (css stays empty: the design is
	drawn by the Print Studio format). Existing styles are never touched."""
	for label in C.DESIGN_LABELS:
		if not frappe.db.exists("Print Style", label):
			frappe.get_doc({"doctype": "Print Style", "print_style_name": label, "standard": 0, "disabled": 0, "css": "/* Drawn by Print Studio */"}).insert(
				ignore_permissions=True
			)


def ensure_all():
	ensure_print_styles()
	return [ensure_print_format(dt) for dt in C.supported_doctypes() if frappe.db.exists("DocType", dt)]


def _set_default(doctype, value):
	ps = frappe.db.get_value("Property Setter", {"doc_type": doctype, "property": "default_print_format"}, "name")
	if value:
		frappe.make_property_setter(
			{
				"doctype": doctype,
				"doctype_or_field": "DocType",
				"property": "default_print_format",
				"value": value,
				"property_type": "Link",
			},
			ignore_validate=True,
		)
	elif ps:
		frappe.delete_doc("Property Setter", ps, ignore_permissions=True, force=True)


def _current_default(doctype):
	return frappe.db.get_value("Property Setter", {"doc_type": doctype, "property": "default_print_format"}, "value") or frappe.get_meta(doctype).default_print_format or ""


def sync(settings, before=None):
	"""Called after Print Designer Settings is saved."""
	ensure_all()
	now = {r.doc_type: r for r in (settings.get("assignments") or [])}
	was = {r.doc_type: r for r in ((before.get("assignments") if before else None) or [])}
	for dt, row in now.items():
		name = pf_name(dt)
		cur = _current_default(dt)
		if row.make_default and cur != name:
			row.previous_default = cur if cur and not cur.startswith(C.PRINT_FORMAT_PREFIX) else (row.previous_default or "")
			_set_default(dt, name)
		elif not row.make_default and cur == name:
			_set_default(dt, row.previous_default or None)
			row.previous_default = ""
	for dt, row in was.items():  # row removed while it held the default
		if dt not in now and row.make_default and _current_default(dt) == pf_name(dt):
			_set_default(dt, row.previous_default or None)
	frappe.clear_cache()
