"""Load, validate and normalize the Print Designer Settings (and per-request overrides) into one plain config dict.

Everything that ends up in generated HTML/CSS passes through here: only fixed choices, validated colours and
plain-text strings are accepted (never HTML)."""

import os
import re

import frappe
from frappe.utils import cint

from universal_theme_studio.print_studio import config as C

_COLOR_RE = re.compile(r"^#[0-9a-fA-F]{6}$")
_URL_RE = re.compile(r"^/(files|assets)/[A-Za-z0-9_\-./ %()]+$")
_IMG_EXT = {".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"}


def safe_hex(v):
	v = (v or "").strip()
	return v.lower() if _COLOR_RE.match(v) else ""


def safe_url(v):
	v = (v or "").strip()
	if not v or ".." in v or not _URL_RE.match(v):
		return ""
	return v if os.path.splitext(v.split("?")[0])[1].lower() in _IMG_EXT else ""


def clean_text(v, n):
	"""Plain text only: control characters and angle brackets removed, length-limited."""
	v = re.sub(r"[\x00-\x08\x0b-\x1f<>]", "", (v or "")).strip()
	return v[:n]


def design_key(v, fallback="modern-blue"):
	if v in C.DESIGN_KEYS:
		return v
	return C.DESIGN_LABELS.get(v, fallback)


OVERRIDABLE = {
	"default_design", "language_mode", "paper_size", "orientation", "margins", "primary_color", "secondary_color", "font_family",
	"font_size", "table_style", "decorative_patterns", "ink_saving", "logo", "header_text", "footer_text", "show_qr",
	"qr_content", "show_signature", "signature_labels",
}


def raw_settings(overrides=None):
	s = frappe.get_cached_doc("Print Designer Settings")
	raw = {k: s.get(k) for k in OVERRIDABLE}
	raw["assignments"] = [(r.doc_type, r.design) for r in (s.get("assignments") or [])]
	for k, v in (overrides or {}).items():
		if k in OVERRIDABLE:
			raw[k] = v
	return raw


def get_config(doctype=None, design=None, overrides=None):
	"""Normalized config for `doctype`. `design` (key or label) wins over the DocType's assignment (gallery/preview)."""
	raw = raw_settings(overrides)
	assigned = None
	for dt, d in raw["assignments"]:
		if dt == doctype and d and d != "Use Default Design":
			assigned = d
	key = design_key(design) if design else design_key(assigned or raw.get("default_design"))
	p0, s0 = C.PALETTES[key]
	font = C.FONTS.get(raw.get("font_family")) or C.FONTS["Tajawal"]
	labels = [clean_text(x, 40) for x in (raw.get("signature_labels") or "").split(",")]
	labels = [x for x in labels if x][:3]
	return {
		"design": key,
		"design_label": C.KEY_TO_LABEL[key],
		"lang_mode": C.LANG_MODES.get(raw.get("language_mode"), "auto"),
		"primary": safe_hex(raw.get("primary_color")) or p0,
		"secondary": safe_hex(raw.get("secondary_color")) or s0,
		"font": font,
		"size": C.SIZES.get(raw.get("font_size"), 10.5),
		"table_style": C.TABLE_STYLES.get(raw.get("table_style"), ""),
		"margin": C.MARGINS.get(raw.get("margins"), 12),
		"paper": "Letter" if raw.get("paper_size") == "Letter" else "A4",
		"orientation": "Landscape" if raw.get("orientation") == "Landscape" else "Portrait",
		"qr": bool(cint(raw.get("show_qr"))),
		"qr_content": C.QR_CONTENT.get(raw.get("qr_content"), "url"),
		"signature": bool(cint(raw.get("show_signature"))),
		"patterns": bool(cint(raw.get("decorative_patterns"))),
		"ink": bool(cint(raw.get("ink_saving"))),
		"logo": safe_url(raw.get("logo")),
		"header_text": clean_text(raw.get("header_text"), 140),
		"footer_text": clean_text(raw.get("footer_text"), 400),
		"sig_labels": labels,
	}
