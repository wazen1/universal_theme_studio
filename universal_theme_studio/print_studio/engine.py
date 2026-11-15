"""Print Studio engine: builds the render context from the REAL document and renders the chosen design.

Values are never recalculated: every number comes from `Document.get_formatted()` (ERPNext's own formatting of
the stored value). Output is produced by a dedicated autoescaping Jinja environment; the only HTML that is
passed through is sanitized with Frappe's `sanitize_html`."""

import re

import frappe
from frappe import _
from jinja2 import Environment, FileSystemLoader
from markupsafe import Markup, escape

from universal_theme_studio.print_studio import config as C
from universal_theme_studio.print_studio import qr as _qr
from universal_theme_studio.print_studio.paginate import chunk_rows
from universal_theme_studio.print_studio import settings as S
from universal_theme_studio.print_studio.css import build_css, mix

_env = None


def env():
	global _env
	if _env is None:
		_env = Environment(
			loader=FileSystemLoader(frappe.get_app_path("universal_theme_studio", "templates", "print")),
			autoescape=True,
			trim_blocks=True,
			lstrip_blocks=True,
		)
	return _env


def rich(value):
	"""Stored rich text / plain text -> safe HTML."""
	from frappe.utils.html_utils import sanitize_html

	value = value or ""
	if re.search(r"<[a-zA-Z/][^>]*>", value):
		return Markup(sanitize_html(value))
	return Markup(str(escape(value)).replace("\n", "<br>"))


def _fmt(d, field, parent=None):
	try:
		return d.get_formatted(field) if parent is None else d.get_formatted(field, parent)
	except Exception:
		return str(d.get(field) or "")


def _blank(v):
	return v in (None, "", 0, 0.0) or (isinstance(v, (list, tuple)) and not v)


def _payments(doc):
	"""Submitted Payment Entries against this invoice (only those the user may read). Amounts are the stored
	allocations, formatted - nothing is recalculated."""
	if doc.doctype not in ("Sales Invoice", "Purchase Invoice") or doc.get("__islocal") or not doc.name:
		return []
	if not frappe.has_permission("Payment Entry", "read"):
		return []
	try:
		rows = frappe.get_all(
			"Payment Entry Reference",
			filters={"reference_doctype": doc.doctype, "reference_name": doc.name, "docstatus": 1},
			fields=["parent", "allocated_amount"],
			order_by="creation asc",
			limit_page_length=20,
		)
		out = []
		for r in rows:
			pe = frappe.db.get_value(
				"Payment Entry", r.parent, ["posting_date", "mode_of_payment", "reference_no", "docstatus"], as_dict=True
			)
			if not pe or pe.docstatus != 1:
				continue
			out.append(
				{
					"date": frappe.utils.formatdate(pe.posting_date),
					"method": pe.mode_of_payment or "",
					"ref": pe.reference_no or r.parent,
					"amount": frappe.utils.fmt_money(r.allocated_amount, currency=doc.get("currency")),
				}
			)
		return out
	except Exception:
		return []


def resolve_mode(cfg, doc, override=None):
	lang = (doc.get("language") or frappe.local.lang or "en").lower()
	base_ar = lang.startswith("ar")
	mode = override if override in ("ar", "en", "both") else cfg["lang_mode"]
	if mode == "auto":
		mode = "ar" if base_ar else "en"
	rtl = (mode == "ar") or (mode == "both" and base_ar)
	return mode, rtl


def company_block(doc, cfg):
	company = doc.get("company")
	row = frappe.db.get_value(
		"Company", company, ["company_name", "company_logo", "phone_no", "email", "website", "tax_id"], as_dict=True
	) if company else None
	row = row or {}
	address = ""
	if company:
		try:
			from frappe.contacts.doctype.address.address import get_address_display, get_default_address

			name = get_default_address("Company", company)
			address = get_address_display(name) if name else ""
		except Exception:
			address = ""
	lines = [x for x in (row.get("phone_no"), row.get("email"), row.get("website")) if x]
	return {
		"name": row.get("company_name") or company or "",
		"logo": cfg["logo"] or S.safe_url(row.get("company_logo")),
		"address": rich(address) if address else "",
		"lines": lines,
		"tax_id": row.get("tax_id") or "",
	}


def build_context(doc, cfg, mode_override=None):
	reg = C.supported_doctypes().get(doc.doctype)
	if not reg:
		frappe.throw(_("Print Studio does not support {0} yet").format(doc.doctype))
	mode, rtl = resolve_mode(cfg, doc, mode_override)
	ptype = doc.get("payment_type")

	title = (reg.get("title_by") or {}).get(ptype) or reg["title"]
	party_label = (reg.get("party_label_by") or {}).get(ptype) or reg.get("party_label")
	party_name = next((doc.get(f) for f in reg.get("party_name", []) if doc.get(f)), "")
	party = {
		"label": party_label,
		"name": party_name,
		"address": rich(doc.get(reg["address"])) if reg.get("address") and doc.get(reg["address"]) else "",
		"contact": rich(doc.get(reg["contact"])) if reg.get("contact") and doc.get(reg["contact"]) else "",
		"tax_id": doc.get(reg["party_tax_id"]) if reg.get("party_tax_id") else "",
	}

	meta = []
	for field, label, kind in reg["meta"]:
		v = doc.get(field)
		if _blank(v):
			continue
		meta.append({"label": label, "value": _fmt(doc, field) if kind == "date" else str(v)})

	# --- item table (columns that are optional appear only if any row has a value)
	rows_src = doc.get(reg["table"]) or []
	cols = []
	for c in reg["cols"]:
		kind = c["kind"]
		if kind in ("num_opt", "text_opt"):
			if not any(not _blank(r.get(c["field"])) for r in rows_src):
				continue
		cols.append(c)
	rows = []
	for r in rows_src:
		cells = []
		for c in cols:
			f, k = c["field"], c["kind"]
			if k == "idx":
				cells.append({"kind": "idx", "v": r.idx})
			elif k == "item":
				name = r.get("item_name") or r.get("item_code") or ""
				desc = r.get("description") or ""
				plain = re.sub(r"<[^>]+>", " ", desc)
				plain = re.sub(r"\s+", " ", plain).strip()
				cells.append({"kind": "item", "name": name, "desc": rich(desc) if plain and plain != name else ""})
			elif k in ("num", "num_opt"):
				cells.append({"kind": "num", "v": _fmt(r, f, doc) if not _blank(r.get(f)) else (_fmt(r, f, doc) if k == "num" else "")})
			else:
				cells.append({"kind": "text", "v": str(r.get(f) or "")})
		rows.append(cells)

	# --- taxes / totals (never recomputed)
	tax_rows = []
	if reg.get("taxes_table") and doc.get(reg["taxes_table"]):
		for t in doc.get(reg["taxes_table"]):
			if not _blank(t.get("tax_amount")):
				tax_rows.append({"label": t.get("description") or t.get("account_head") or "", "value": _fmt(t, "tax_amount", doc)})
	totals = []
	grand_field = reg.get("grand_field")
	if not grand_field:
		grand_field = "rounded_total" if (doc.get("rounded_total") and not doc.get("disable_rounded_total")) else "grand_total"
	for field, label in reg["totals"]:
		v = doc.get(field)
		if field == "total_taxes_and_charges" and tax_rows:
			totals.extend({"label": {"en": t["label"], "ar": t["label"]}, "value": t["value"], "grand": False} for t in tax_rows)
			continue
		if field == "rounded_total" and (doc.get("disable_rounded_total") or _blank(v) or v == doc.get("grand_total")):
			continue
		if _blank(v) and field != grand_field:
			continue
		totals.append({"label": label, "value": _fmt(doc, field), "grand": field == grand_field})
	if not any(t["grand"] for t in totals) and totals:
		totals[-1]["grand"] = True

	in_words = doc.get(reg["in_words"]) if reg.get("in_words") else ""
	payments = _payments(doc)
	schedule = []
	if reg.get("payment_schedule"):
		for r in doc.get("payment_schedule") or []:
			schedule.append(
				{
					"term": r.get("payment_term") or r.get("description") or "",
					"due": _fmt(r, "due_date", doc) if r.get("due_date") else "",
					"amount": _fmt(r, "payment_amount", doc) if not _blank(r.get("payment_amount")) else "",
				}
			)
	notes = [{"label": label, "html": rich(doc.get(f))} for f, label in reg["notes"] if doc.get(f)]

	# --- signature, QR, footer
	defaults = [C.L("Prepared by", "أعدّه"), C.L("Approved by", "اعتمده"), C.L("Received by", "استلمه")]
	sig = [{"en": x, "ar": x} for x in cfg["sig_labels"]] if cfg["sig_labels"] else defaults
	qr_svg = ""
	if cfg["qr"] and doc.name:
		if cfg["qr_content"] == "number":
			total = next((t["value"] for t in totals if t["grand"]), "")
			data = f"{doc.doctype} | {doc.name} | {total}"
		else:
			data = frappe.utils.get_url_to_form(doc.doctype, doc.name)
		qr_svg = Markup(_qr.qr_svg(data))

	status = None
	if doc.get("docstatus") == 0:
		status = C.L("Draft", "مسودة")
	elif doc.get("docstatus") == 2:
		status = C.L("Cancelled", "ملغي")

	return {
		"cfg": cfg,
		"design": cfg["design"],
		"mode": mode,
		"rtl": rtl,
		"title": title,
		"number": doc.name,
		"status": status,
		"company": company_block(doc, cfg),
		"party": party,
		"meta": meta,
		"cols": cols,
		"rows": rows,
		"chunks": chunk_rows(rows, cols, cfg),
		"totals": totals,
		"in_words": in_words,
		"schedule": schedule,
		"payments": payments,
		"notes": notes,
		"sig": sig,
		"qr": qr_svg,
		"deco": cfg["patterns"] and not cfg["ink"],
		"table_class": cfg["table_style"] or {
			"classic-gold": "lined", "modern-blue": "striped", "elegant-teal": "minimal",
			"purple-wave": "striped", "executive-document": "bordered", "creative-corporate": "lined", "business-classic": "bordered", "info-card": "striped", "full-band": "striped", "number-tile": "striped",
		}[cfg["design"]],
		"P": cfg["primary"],
		"S": cfg["secondary"],
		"PL": mix(cfg["primary"], "#ffffff", 0.9),
	}


def _font_base():
	"""wkhtmltopdf cannot resolve /assets from a temp file, and Frappe's URL expander would corrupt the
	@font-face rule, so PDF rendering (no request, or download_pdf) gets an absolute site URL."""
	cmd = (frappe.local.form_dict or {}).get("cmd") or ""
	if getattr(frappe.local, "request", None) and "download_pdf" not in cmd:
		return ""
	return frappe.utils.get_url().rstrip("/")


_AR = re.compile(r"[\u0600-\u06FF\u0750-\u077F]")
_LAT = re.compile(r"[A-Za-z0-9](?:[A-Za-z0-9 .,:;/#&%+()\-_'\u00C0-\u024F]*[A-Za-z0-9)%.])?")
_SKIP = {"style", "script", "svg"}


_NUM_SPAN = re.compile(r'<span class="num">([^<]*)</span>')
_AMOUNT = re.compile(r"-?\d[\d,.\u066B\u066C]*-?")


def _money_parts(m):
	"""Amounts with an Arabic currency name ("دينار ليبي 28.000"): always show the currency to the LEFT of the number
	(number on the right), whatever the bidi algorithm would do with the mixed string."""
	t = m.group(1)
	a = _AMOUNT.search(t)
	if not a or not _AR.search(t):
		return m.group(0)
	symbol = (t[: a.start()] + t[a.end():]).strip()
	if not symbol:
		return m.group(0)
	return (
		'<span class="num" dir="ltr"><span class="cur" style="display:inline-block;direction:rtl">%s</span>&nbsp;'
		'<span class="amt" style="display:inline-block;direction:ltr">%s</span></span>' % (symbol, a.group(0))
	)


def isolate_latin(html):
	"""wkhtmltopdf 0.12.6 (unpatched Qt) overlaps a Latin/number run that sits in the same text node as Arabic.
	Wrapping each such run in <bdi> gives it its own inline box and fixes the overlap; text is unchanged."""
	out, skip = [], 0
	for part in re.split(r"(<[^>]+>)", html):
		if part.startswith("<"):
			m = re.match(r"</?\s*([a-zA-Z0-9]+)", part)
			if m and m.group(1).lower() in _SKIP:
				skip += -1 if part.startswith("</") else (0 if part.endswith("/>") else 1)
				skip = max(skip, 0)
			out.append(part)
		elif skip or not _AR.search(part):
			out.append(part)
		else:
			out.append(_LAT.sub(lambda m: "<bdi>%s</bdi>" % m.group(0), part))
	return "".join(out)


def render_html(doc, cfg, mode_override=None):
	ctx = build_context(doc, cfg, mode_override)
	tpl = env().get_template("base.html")
	return Markup(isolate_latin(_NUM_SPAN.sub(_money_parts, tpl.render(ctx=ctx, css=Markup(build_css(cfg, _font_base()))))))


def _overrides_from_request():
	"""Whitelisted per-request choices (gallery/preview links): design, language, ink saving. Validated, never trusted."""
	fd = frappe.form_dict
	design = fd.get("uts_design") or (fd.get("style") if fd.get("style") in C.DESIGN_LABELS else None)
	mode = fd.get("uts_lang")
	ov = {}
	if fd.get("uts_ink") in ("1", "0", 1, 0):
		ov["ink_saving"] = int(fd.get("uts_ink"))
	return (S.design_key(design, None) if design else None), (mode if mode in ("ar", "en", "both") else None), ov


def uts_print(doc):
	"""Jinja method used by the 'Print Studio - <DocType>' Print Formats: {{ uts_print(doc) }}"""
	design, mode, ov = _overrides_from_request()
	cfg = S.get_config(doc.doctype, design=design, overrides=ov)
	return render_html(doc, cfg, mode)
