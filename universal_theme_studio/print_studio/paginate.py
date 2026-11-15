"""Deterministic pagination for the item table.

wkhtmltopdf builds without the patched Qt (such as the one installed here) neither repeat <thead> on every page nor
keep a table row whole across a page boundary, and no CSS fixes that. Instead of relying on the engine, the item rows are
split into chunks that are *estimated* (conservatively, so a chunk never overflows) to fit one page; every chunk is
its own table with its own header and starts on a new page. Engines that do support repeating headers
(patched wkhtmltopdf, Chrome, PlutoPrint, the browser) render the same markup correctly, so the output is the same
everywhere. Row values are untouched: this only decides where the table is cut."""

import math
import re

PX_MM = 96 / 25.4
PAPER_MM = {"A4": (210.0, 297.0), "Letter": (215.9, 279.4)}
FIRST_PAGE_RESERVE = 400  # px used above the table on page 1 (banner, party, meta) - generous for every design
LAST_PAGE_RESERVE = 380  # px needed under the table (totals, in words, QR, signatures, footer)
CHAR_EM = 0.46  # average glyph width in em for Arabic/Latin mixed bold text
WK = 0.72  # wkhtmltopdf lays CSS px out smaller than a browser (measured on the installed build)
SAFETY = 1.1


def _plain(html):
	t = re.sub(r"<\s*(br|/p|/div|/li)\s*/?>", "\n", html or "", flags=re.I)
	return re.sub(r"<[^>]+>", "", t)


def _lines(text, em_px, avail_px):
	if not text:
		return 0
	per_line = max(int(avail_px / (em_px * CHAR_EM)), 6)
	return sum(max(1, math.ceil(len(p) / per_line)) for p in text.split("\n"))


def chunk_rows(rows, cols, cfg):
	"""Return a list of row lists. `rows` are cell lists as built by the engine."""
	if len(rows) <= 1:
		return [rows]
	w_mm, h_mm = PAPER_MM.get(cfg["paper"], PAPER_MM["A4"])
	if str(cfg["orientation"]).lower() == "landscape":
		w_mm, h_mm = h_mm, w_mm
	m = cfg["margin"]
	content_w = (w_mm - 2 * m) * PX_MM
	page_h = (h_mm - 2 * m) * PX_MM
	fixed = sum(c.get("width") or 0 for c in cols)
	item_w = max(content_w * (100 - fixed) / 100.0 - 16, 80)
	em = cfg["size"] * 96 / 72 * 0.95
	lh = em * 1.5
	head_h = 14 + em * 0.88 / 0.95 * 1.5 + 2
	cap_first = page_h - FIRST_PAGE_RESERVE - head_h
	cap_next = page_h - head_h - 24

	def height(cells):
		name_l = desc_l = 0
		for c in cells:
			if c["kind"] == "item":
				name_l = _lines(c["name"], em, item_w)
				desc_l = _lines(_plain(c["desc"]), em * 0.84 / 0.95 * 0.95, item_w)
		return (16 + max(name_l, 1) * lh + desc_l * lh * 0.84 + 2) * SAFETY * WK

	chunks, cur, used, cap = [], [], 0.0, cap_first
	for cells in rows:
		h = height(cells)
		if cur and used + h > cap:
			chunks.append(cur)
			cur, used, cap = [], 0.0, cap_next
		cur.append(cells)
		used += h
	if cur:
		# the last chunk must leave room for totals/signatures, otherwise they would be cut apart
		if len(chunks) and used > cap - LAST_PAGE_RESERVE and len(cur) > 1:
			keep = []
			while cur and used > cap - LAST_PAGE_RESERVE and len(cur) > 1:
				keep.insert(0, cur.pop())
				used -= height(keep[0])
			chunks.append(cur)
			cur = keep
		chunks.append(cur)
	return chunks
