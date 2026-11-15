"""Whitelisted endpoints of the Print Studio. Reads respect document permissions (same checks as Frappe's own
print view); writes are System Manager only. No endpoint accepts HTML or free-form CSS."""

import json

import frappe
from frappe import _
from markupsafe import escape

from universal_theme_studio.print_studio import config as C
from universal_theme_studio.print_studio import engine
from universal_theme_studio.print_studio import provision as P
from universal_theme_studio.print_studio import settings as S

PAPER_MM = {"A4": (210, 297), "Letter": (216, 279)}


def _as_dict(v):
	if isinstance(v, str):
		try:
			v = json.loads(v or "{}")
		except ValueError:
			v = {}
	return v if isinstance(v, dict) else {}


def _check_supported(doctype):
	if doctype not in C.supported_doctypes() or not frappe.db.exists("DocType", doctype):
		frappe.throw(_("Print Studio does not support {0}").format(doctype), frappe.ValidationError)


@frappe.whitelist()
def gallery_data():
	"""Designs, supported DocTypes and their current assignment (admin Theme Studio tab)."""
	frappe.only_for("System Manager")
	s = frappe.get_doc("Print Designer Settings")
	rows = {r.doc_type: r for r in (s.get("assignments") or [])}
	docs = []
	for dt, reg in C.supported_doctypes().items():
		if not frappe.db.exists("DocType", dt):
			continue
		r = rows.get(dt)
		docs.append(
			{
				"doctype": dt,
				"title": reg["title"],
				"design": S.design_key(r.design, "") if r and r.design != "Use Default Design" else "",
				"make_default": int(r.make_default) if r else 0,
				"print_format": P.pf_name(dt),
				"is_default": int(P._current_default(dt) == P.pf_name(dt)),
			}
		)
	return {
		"default_design": S.design_key(s.default_design),
		"designs": [{"key": k, "label": l, "primary": C.PALETTES[k][0], "secondary": C.PALETTES[k][1]} for l, k in C.DESIGN_LABELS.items()],
		"doctypes": docs,
	}


@frappe.whitelist()
def sample_docs(doctype):
	"""Recent documents the current user may read (for previews with real data)."""
	_check_supported(doctype)
	frappe.has_permission(doctype, "read", throw=True)
	return frappe.get_list(doctype, fields=["name", "modified"], order_by="modified desc", limit_page_length=20)


@frappe.whitelist()
def preview(doctype, name, design=None, lang=None, overrides=None):
	"""Full HTML page of the document rendered with the chosen design (and unsaved setting overrides).
	Same renderer as the real Print Format, so preview, print and PDF agree."""
	_check_supported(doctype)
	doc = frappe.get_doc(doctype, name)
	frappe.has_permission(doctype, "print", doc=doc, throw=True)
	cfg = S.get_config(doctype, design=S.design_key(design, None) if design else None, overrides=_as_dict(overrides))
	body = engine.render_html(doc, cfg, lang if lang in ("ar", "en", "both") else None)
	w, h = PAPER_MM[cfg["paper"]]
	if cfg["orientation"] == "Landscape":
		w, h = h, w
	rtl = 'class="uts-doc' in str(body) and " rtl " in str(body)
	return (
		"<!doctype html><html dir=\"%s\"><head><meta charset=\"utf-8\"><title>%s</title>"
		"<style>html,body{margin:0;background:#d9dde3}"
		".uts-sheet.print-format{background:#fff;width:%smm;min-height:%smm;margin:14px auto!important;padding:%smm!important;box-shadow:0 2px 14px rgba(0,0,0,.25);box-sizing:border-box}"
		"@media print{html,body{background:#fff}.uts-sheet.print-format{box-shadow:none;margin:0!important;width:auto;min-height:0;padding:0!important}}</style></head>"
		"<body><div class=\"uts-sheet print-format\">%s</div></body></html>"
	) % ("rtl" if rtl else "ltr", escape(doc.name), w, h, cfg["margin"], body)


@frappe.whitelist(methods=["POST"])
def save_assignment(doctype, design="Use Default Design", make_default=0):
	frappe.only_for("System Manager")
	_check_supported(doctype)
	label = design if design in ("Use Default Design", *C.DESIGN_LABELS) else C.KEY_TO_LABEL.get(design)
	if not label:
		frappe.throw(_("Unknown design"), frappe.ValidationError)
	s = frappe.get_doc("Print Designer Settings")
	row = next((r for r in s.assignments if r.doc_type == doctype), None)
	if not row:
		row = s.append("assignments", {"doc_type": doctype})
	row.design = label
	row.make_default = 1 if int(make_default or 0) else 0
	s.save(ignore_permissions=True)
	return gallery_data()


@frappe.whitelist(methods=["POST"])
def set_default_design(design):
	frappe.only_for("System Manager")
	label = design if design in C.DESIGN_LABELS else C.KEY_TO_LABEL.get(design)
	if not label:
		frappe.throw(_("Unknown design"), frappe.ValidationError)
	s = frappe.get_doc("Print Designer Settings")
	s.default_design = label
	s.save(ignore_permissions=True)
	return gallery_data()
