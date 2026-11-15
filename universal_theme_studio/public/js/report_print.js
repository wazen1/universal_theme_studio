/* Universal Theme Studio - Oracle-style printing for accounting and financial reports (Oracle Classic / Oracle Modern).

   How it plugs in (no core file is changed):
   - Frappe renders a report for print / PDF from the data the user's own report run already returned, using the
     "print_grid" template. We register a second template ("uts_report_print") and make QueryReport pick it when the
     style is an Oracle style. Column list, row order, totals and every displayed value come from the same objects and
     the same formatting calls the standard template uses, so printed values equal the on-screen report.
   - The print dialog gets extra fields (style, page size, font, row numbers) via a wrapper around
     frappe.ui.get_print_settings; defaults come from the organization settings and the user's own preference.
   - A custom Print Format chosen by the user, or a report outside the configured scope, keeps the standard output.
   - Any error falls back to the standard template. */
(function () {
	if (!window.frappe) return;
	const uts = (frappe.uts = frappe.uts || {});
	const STYLES = { classic: "Oracle Classic", modern: "Oracle Modern", audit: "Audit Ledger" };
	const STD = "Standard (Frappe)";
	const FONT = { Tajawal: ["UTSR Tajawal", "tajawal"], Cairo: ["UTSR Cairo", "cairo"] };
	const T = {
		en: {
			period: "Period", from: "From", to: "To", asof: "As of", company: "Company", currency: "Currency", params: "Report parameters",
			printed_by: "Printed by", report_date: "Report Date", printed_on: "Printed on", page: "Page", of: "of", total: "Total", tax: "Tax ID", all: "All",
		},
		ar: {
			period: "الفترة", from: "من", to: "إلى", asof: "كما في", company: "الشركة", currency: "العملة", params: "معايير التقرير",
			printed_by: "طُبع بواسطة", report_date: "تاريخ التقرير", printed_on: "تاريخ الطباعة", page: "صفحة", of: "من", total: "الإجمالي", tax: "الرقم الضريبي", all: "الكل",
		},
	};
	const esc = (s) => frappe.utils.escape_html(String(s == null ? "" : s));
	const AR_RE = /[؀-ۿݐ-ݿ]/;
	let cur = null; // state of the print currently being prepared: {mode, ctx}
	const cache = {};

	/* ------------------------------------------------------------ settings */
	function boot() { return (frappe.boot.uts && frappe.boot.uts.report_print) || { org: {}, user: {} }; }
	function resolve(ps) {
		const b = boot(), o = b.org || {}, u = b.user || {};
		const pick = (k, psk, fb) => (ps && ps[psk]) || u[k] || o[k] || fb;
		const style = pick("style", "uts_style", "Oracle Classic");
		const lang = o.lang && o.lang !== "auto" ? o.lang : ((frappe.boot.lang || "en").startsWith("ar") ? "ar" : "en");
		const rn = ps && ps.uts_rownum != null && ps.uts_rownum !== "" ? ps.uts_rownum : (u.show_rownum != null ? u.show_rownum : o.show_rownum);
		return {
			style: style === STYLES.modern ? "modern" : style === STYLES.audit ? "audit" : style === STD ? "standard" : "classic",
			page: pick("page_size", "uts_page_size", "A4") === "A3" ? "A3" : "A4",
			orientation: pick("orientation", "orientation", "Landscape") === "Portrait" ? "Portrait" : "Landscape",
			font: FONT[pick("font", "uts_font", "Tajawal")] ? pick("font", "uts_font", "Tajawal") : "Tajawal",
			rownum: !!parseInt(rn || 0, 10),
			lang, rtl: lang === "ar",
			logo: o.show_logo !== 0, user: o.show_user !== 0, date: o.show_date !== 0,
		};
	}

	/* ------------------------------------------------------------ small helpers */
	const tr = (cfg, k) => T[cfg.lang][k];
	function fmtDate(v) { try { return frappe.datetime.str_to_user(v); } catch (e) { return v; } }
	function periodText(cfg, f) {
		f = f || {};
		const a = f.from_date || f.period_start_date || f.start_date || f.from_posting_date;
		const b = f.to_date || f.period_end_date || f.end_date || f.to_posting_date;
		if (a && b) return `${tr(cfg, "from")} ${fmtDate(a)} ${tr(cfg, "to")} ${fmtDate(b)}`;
		if (f.from_fiscal_year || f.to_fiscal_year) {
			const x = f.from_fiscal_year, y = f.to_fiscal_year || x;
			return x === y ? `${x}` : `${x} - ${y}`;
		}
		if (f.fiscal_year) return `${f.fiscal_year}`;
		const asof = f.report_date || f.as_on_date || f.posting_date || b || a;
		if (asof) return `${tr(cfg, "asof")} ${fmtDate(asof)}`;
		return "";
	}
	function filterPairs(cfg, report, filters) {
		const out = [];
		Object.keys(filters || {}).forEach((k) => {
			let v = filters[k];
			if (v === "" || v == null || v === 0 || v === false || (Array.isArray(v) && !v.length)) return;
			let label = k;
			try { const f = report && report.get_filter && report.get_filter(k); if (f && f.df) { label = f.df.label || k; if (f.df.fieldtype === "Date" && typeof v === "string") v = fmtDate(v); if (f.df.fieldtype === "Check") v = "✓"; } } catch (e) { /* keep raw */ }
			if (Array.isArray(v)) v = v.join(", ");
			out.push([__(label), String(v)]);
		});
		return out.slice(0, 16);
	}
	// wkhtmltopdf (unpatched Qt) overlaps a Latin/number run sitting in the same text node as Arabic; its own <bdi> fixes it
	function isolateLatin(html) {
		const LAT = /[A-Za-z0-9](?:[A-Za-z0-9 .,:;/#&%+()\-_'À-ɏ]*[A-Za-z0-9)%.])?/g;
		let skip = 0;
		return html.split(/(<[^>]+>)/).map((p) => {
			if (p[0] === "<") {
				const m = p.match(/^<\s*(\/?)\s*([a-zA-Z0-9]+)/);
				if (m && ["style", "script", "svg"].includes(m[2].toLowerCase())) skip = Math.max(0, skip + (m[1] ? -1 : (/\/>$/.test(p) ? 0 : 1)));
				return p;
			}
			return skip || !AR_RE.test(p) ? p : p.replace(LAT, (x) => (/[A-Za-z]/.test(x) ? `<bdi>${x}</bdi>` : x));
		}).join("");
	}
	// "دينار ليبي 28.000" -> currency name on the left of the number
	function moneyParts(txt) {
		const plain = String(txt);
		if (!AR_RE.test(plain) || /[<>]/.test(plain)) return null;
		const m = plain.match(/-?\d[\d,.٫٬]*-?/);
		if (!m) return null;
		const sym = (plain.slice(0, m.index) + plain.slice(m.index + m[0].length)).trim();
		return sym ? `<span class="uts-n" dir="ltr"><span class="uts-cur" style="display:inline-block;direction:rtl">${esc(sym)}</span>&nbsp;<span style="display:inline-block;direction:ltr">${esc(m[0])}</span></span>` : null;
	}

	/* ------------------------------------------------------------ cell value (same expression as the standard template) */
	function cellHtml(col, row, data) {
		const value = col.fieldname ? row[col.fieldname] : row[col.id];
		const formatData = row.is_total_row && ["Currency", "Float"].includes(col.fieldtype) ? data[0] : row;
		if (row.is_total_row && col._index == 0) return esc(__("Total"));
		if (col.fieldtype == "Check") return value == 1 ? "✓" : "✗";
		if (col.formatter) return col.formatter(row._index, col._index, value, col, formatData, true);
		if (col.format) return col.format(value, row, col, formatData);
		if (col.docfield) return frappe.format(value, col.docfield);
		return esc(value);
	}
	function plainLen(h) { return String(h == null ? "" : h).replace(/<[^>]+>/g, "").length; }

	/* ------------------------------------------------------------ CSS */
	function css(cfg, ink) {
		const [fam, slug] = FONT[cfg.font];
		const base = (window.location.origin || "") + "/assets/universal_theme_studio/fonts/print/" + slug;
		const modern = cfg.style === "modern";
		const audit = cfg.style === "audit";
		const acc = audit ? "#212121" : modern ? "#20584e" : "#29495c";
		const hd = audit ? "#ededed" : modern ? "#20584e" : "#cbdde9";
		const grid = audit ? "#929292" : modern ? "#c5d4d0" : "#a4b6c2";
		return `
@font-face{font-family:"${fam}";src:  url(${base}-regular.ttf) format("truetype");font-weight:400}
@font-face{font-family:"${fam}";src:  url(${base}-bold.ttf) format("truetype");font-weight:700}
.print-format{max-width:none!important;width:auto!important;padding:0!important;box-shadow:none!important;margin:0!important;
 margin-top:12mm!important;margin-bottom:14mm!important;margin-left:10mm!important;margin-right:10mm!important;page-size:${cfg.page};orientation:${cfg.orientation}}
@page{size:${cfg.page} ${cfg.orientation.toLowerCase()};margin:12mm 10mm 14mm 10mm}
.uts-rp,.uts-rp *{box-sizing:border-box;letter-spacing:0!important;text-rendering:auto!important}
.uts-rp{font-family:"${fam}",Tahoma,Arial,sans-serif;color:#111;font-size:${cfg.fs || 9}pt;line-height:1.4;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.uts-rp.rtl{direction:rtl;text-align:right}.uts-rp.ltr{direction:ltr;text-align:left}
.uts-rp table{border-collapse:collapse;border-spacing:0;width:100%}
.uts-rp table.report-head{table-layout:fixed;margin:0 0 2.5mm;border-top:${audit ? "3px double" : "2px solid"} ${acc};background:${modern ? "#edf4f1" : "#fff"};font-size:10pt;line-height:1.35}
.uts-rp .report-head td{vertical-align:middle;padding:3mm 4mm;word-wrap:break-word}
.uts-rp .report-head .stamp{width:26%;text-align:${cfg.rtl ? "left" : "right"};border-${cfg.rtl ? "right" : "left"}:1px solid ${grid}}
.uts-rp .report-head .identity{border-${cfg.rtl ? "right" : "left"}:${modern ? "4px solid " + acc : "0"}}
.uts-rp .report-head .logo{max-height:9mm;max-width:32mm;vertical-align:middle}
.uts-rp .report-head .co{font-weight:700;color:${acc};font-size:10pt}
.uts-rp .report-head .co-s,.uts-rp .report-head .stamp-label{font-size:8pt;color:#475259}
.uts-rp .report-head .ttl{font-size:17pt;font-weight:700;color:${acc};line-height:1.25;margin:1mm 0}
.uts-rp .report-head .sub{font-size:9pt;color:#34424a}
.uts-rp .report-head .date-token{display:inline-block;direction:ltr;white-space:nowrap}
.uts-rp .report-head .stamp-value{display:inline-block;font-size:10pt;font-weight:700;color:${acc}}
.uts-rp .report-head .folio{font-size:8pt;margin-top:1mm}
.uts-rp table.parbox{width:100%;margin:5px 0 8px;font-size:8pt}
.uts-rp table.parbox th{background:${hd};color:${modern ? "#fff" : acc};text-align:start;font-weight:700;padding:3px;border-bottom:1px solid #000}
.uts-rp table.parbox td{padding:1px 6px;vertical-align:top;width:25%;border-bottom:1px solid ${grid}}
.uts-rp table.parbox td.k{background:${audit ? "#f4f4f4" : modern ? "#edf4f1" : "#edf3f7"}}
.uts-rp.ltr table.parbox td.k{text-align:right;font-weight:700;width:20%}.uts-rp.rtl table.parbox td.k{text-align:left;font-weight:700;width:20%}
.uts-rp.ltr table.parbox td.v{text-align:left;width:30%}.uts-rp.rtl table.parbox td.v{text-align:right;width:30%}
.uts-rp table.dt{table-layout:fixed;margin-top:4px;border:1px solid ${acc}}
.uts-rp table.dt th{background:${hd};color:${modern ? "#fff" : acc};font-weight:700;font-size:.9em;padding:4px 5px;border:1px solid ${grid};border-bottom:${modern ? 2 : 1.5}px solid ${acc};text-align:start;vertical-align:bottom}
.uts-rp table.dt td{padding:3px 5px;border:1px solid ${grid};border-width:${modern || audit ? "0 0 1px" : "1px"};vertical-align:top;word-wrap:break-word}
${modern ? ".uts-rp table.dt tbody tr:nth-child(even):not(.sum0):not(.sum1):not(.sum2) td{background:#f3f7f5}" : ""}
${audit ? ".uts-rp table.dt tr.sum2 td{border-bottom:3px double #222}" : ""}
.uts-rp table.dt .group-head th{background:#fff;text-align:center;border-bottom:2px solid #222}
.uts-rp table.dt tr.b td{font-weight:700}
.uts-rp table.dt tr.sum0 td{background:${modern ? "#ececec" : "#e6e6e6"};font-weight:700}
.uts-rp table.dt tr.sum1 td{background:${modern ? "#f3f3f3" : "#f0f0f0"};font-weight:700;border-top:1.5px solid ${acc}}
.uts-rp table.dt tr.sum2 td{background:${modern ? "#e4e4e4" : "#d9d9d9"};font-weight:700;border-top:1.5px solid ${acc};border-bottom:${modern ? 2 : 1.5}px double ${acc}}
.uts-rp.ltr table.dt .n{text-align:right}.uts-rp.rtl table.dt .n{text-align:left}
.uts-rp.ltr table.dt th.n{text-align:right}.uts-rp.rtl table.dt th.n{text-align:left}
.uts-rp .n .uts-n,.uts-rp .n{direction:ltr}
.uts-rp table.dt td.n{white-space:nowrap}
.uts-rp table.dt thead{display:table-header-group}
.uts-rp table.dt tr{page-break-inside:avoid}
.uts-rp .chunk.brk{page-break-before:always}
.uts-rp .foot{border-top:1px solid #999;padding-top:3px;font-size:.78em;color:#444;background:#fff}
.uts-rp .foot table td{padding:0;width:33%}
.uts-rp .foot td.c{text-align:center}
.uts-rp.ltr .foot td.e0{text-align:left}.uts-rp.rtl .foot td.e0{text-align:right}
.uts-rp.ltr .foot td.e{text-align:right}.uts-rp.rtl .foot td.e{text-align:left}
.uts-rp .chunk{position:relative}
.uts-rp .foot.abs{position:absolute;bottom:0;left:0;right:0}
@page{@top-right{content:"Page " counter(page) " / " counter(pages);font-size:8pt;color:#444}}
.uts-rp a{color:inherit;text-decoration:none}
@media print{.uts-rp .foot.fix{position:fixed;bottom:0;left:0;right:0;background:#fff}}
${ink ? "" : ""}`;
	}

	/* ------------------------------------------------------------ rendering */
	function columnsFor(opts, cfg) {
		const cols = (opts.columns || []).filter((c) => c.name && c._id !== "_check");
		return cols;
	}
	/* Column weights from the text actually printed (formatted values incl. currency names), longest word for text
	   columns, so nothing overprints and words are not broken. Returns {pct, chars}. */
	function widths(cols, rows, cfg) {
		const w = cols.map((c) => {
			const numeric = frappe.model.is_numeric_field(c.fieldtype);
			let longest = 0, typical = [];
			rows.slice(0, 200).forEach((r) => {
				let t = "";
				try { t = String(cellHtml(c, r, rows)).replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&[a-z#0-9]+;/gi, "x"); } catch (e) { t = ""; }
				typical.push(t.length);
				t.split(/\s+/).forEach((word) => { longest = Math.max(longest, word.length); });
				if (numeric) longest = Math.max(longest, t.length);
			});
			typical.sort((x, y) => x - y);
			const p90 = typical.length ? typical[Math.floor(typical.length * 0.9)] : 0;
			const head = plainLen(__(c.name));
			const headWord = String(__(c.name)).split(/\s+/).reduce((m, x) => Math.max(m, x.length), 0);
			const need = numeric ? Math.max(longest, headWord) : Math.max(longest, headWord, Math.min(p90, 28));
			return Math.max(need + 2, 6);
		});
		const tot = w.reduce((a, b) => a + b, 0) + (cfg.rownum ? 4 : 0);
		return { pct: w.map((x) => (x / tot) * 100), chars: tot };
	}
	function fitFont(chars, ncols, cfg) {
		const [wmm] = paper(cfg), contentPx = (wmm - 20) * 96 / 25.4;
		for (let fs = (cfg.page === "A3" ? 10.5 : 9.5); fs >= 6; fs -= 0.5) {
			const px = fs * 96 / 72;
			if (chars * px * 0.5 + ncols * 10 <= contentPx) return fs;
		}
		return 6;
	}
	function paper(cfg) {
		const d = cfg.page === "A3" ? [297, 420] : [210, 297];
		return cfg.orientation === "Landscape" ? [d[1], d[0]] : d;
	}
	function chunkRows(rows, cols, wpct, cfg, headerPx) {
		const [wmm, hmm] = paper(cfg);
		const PX = 96 / 25.4, fs = cfg.fs * 96 / 72;
		const contentW = (wmm - 20) * PX, pageH = (hmm - 26) * PX;
		const lh = fs * 1.4 * 0.72; // measured scale of wkhtmltopdf layout vs a browser
		const rowH = (r) => {
			let lines = 1;
			cols.forEach((c, i) => {
				const v = c.fieldname ? r[c.fieldname] : r[c.id];
				const len = v == null || typeof v === "object" ? 0 : String(v).replace(/<[^>]+>/g, "").length;
				const per = Math.max(Math.floor((contentW * wpct[i] / 100 - 10) / (fs * 0.46)), 4);
				if (!frappe.model.is_numeric_field(c.fieldtype)) lines = Math.max(lines, Math.ceil(len / per) || 1);
			});
			return (lines * lh + 8) * 0.84;
		};
		const headH = lh * 2 + 10 + (cfg.style === "audit" ? lh + 10 : 0);
		const chunks = []; let curChunk = [], used = 0, cap = pageH - headerPx - headH - 40;
		rows.forEach((r) => {
			const h = rowH(r);
			if (curChunk.length && used + h > cap) { chunks.push(curChunk); curChunk = []; used = 0; cap = pageH - headH - 140; }
			curChunk.push(r); used += h;
		});
		if (curChunk.length) chunks.push(curChunk);
		return chunks;
	}
	/* wkhtmltopdf (unpatched Qt) does not wrap Arabic text inside a left-to-right table: the lines overprint. In that one
	   case (PDF) wrap Arabic-only text cells ourselves, at word boundaries, from the column width. */
	function manualWrap(text, perLine) {
		const words = String(text).split(/\s+/), lines = []; let line = "";
		words.forEach((w) => { if (line && (line + " " + w).length > perLine) { lines.push(line); line = w; } else line = line ? line + " " + w : w; });
		if (line) lines.push(line);
		return lines.map(esc).join("<br>");
	}
	/* beginning balance / subtotal / grand total rows get the Oracle summary look (recognised from the label text) */
	const RE_BEGIN = /^(opening|beginning|opening balance|الافتتاح|افتتاحي|رصيد افتتاحي|الرصيد الافتتاحي)/i;
	const RE_GRAND = /(closing|grand total|الختامي|ختامي|الإجمالي الكلي)/i;
	const RE_SUB = /^(total|subtotal|الإجمالي|المجموع|إجمالي)/i;
	function rowKind(row, cols) {
		let k = "";
		for (let i = 0; i < Math.min(cols.length, 4); i++) {
			const c = cols[i];
			if (frappe.model.is_numeric_field(c.fieldtype)) continue;
			const v = c.fieldname ? row[c.fieldname] : row[c.id];
			if (typeof v !== "string") continue;
			const t = v.replace(/<[^>]+>/g, "").replace(/['"]/g, "").trim();
			if (RE_GRAND.test(t)) return "sum2";
			if (RE_BEGIN.test(t)) k = k || "sum0";
			else if (RE_SUB.test(t)) k = k || "sum1";
		}
		return k || (row.is_total_row ? "sum1" : "");
	}
	function tableHtml(cols, wpct, rows, data, cfg, rowStart) {
		const rn = cfg.rownum;
		let h = `<table class="dt"><colgroup>${rn ? '<col style="width:3%">' : ""}${wpct.map((x) => `<col style="width:${x.toFixed(2)}%">`).join("")}</colgroup><thead>`;
		if (cfg.style === "audit" && cols.length) {
			// Group adjacent columns only. Reports may interleave amounts and document fields.
			const groups = [];
			const kinds = cols.map((c) => !!frappe.model.is_numeric_field(c.fieldtype));
			if (rn) kinds.unshift(false);
			for (const numeric of kinds) {
				const last = groups[groups.length - 1];
				if (last && last.numeric === numeric) last.count++;
				else groups.push({ numeric, count: 1 });
			}
			if (groups.length === 2) {
				h += '<tr class="group-head">' + groups.map(({ numeric, count }) =>
					`<th scope="colgroup" colspan="${count}">${esc(__(numeric ? "Numeric values" : "Record details"))}</th>`
				).join("") + "</tr>";
			}
		}
		h += "<tr>";
		if (rn) h += `<th class="n">#</th>`;
		cols.forEach((c) => { h += `<th class="${frappe.model.is_numeric_field(c.fieldtype) ? "n" : ""}">${esc(__(c.name))}</th>`; });
		h += "</tr></thead><tbody>";
		rows.forEach((row, ri) => {
			const cls = [rowKind(row, cols), row.bold == 1 ? "b" : ""].join(" ").trim();
			h += `<tr class="${cls}">`;
			if (rn) h += `<td class="n">${rowStart + ri + 1}</td>`;
			cols.forEach((c, ci) => {
				const numeric = frappe.model.is_numeric_field(c.fieldtype);
				let v;
				try { v = cellHtml(c, row, data); } catch (e) { v = esc(row[c.fieldname || c.id]); }
				if (numeric) { const mp = moneyParts(v); if (mp) v = mp; }
				const ind = c._index == 0 && !row.is_total_row ? ` style="padding-${cfg.rtl ? "right" : "left"}:${(parseInt(row.indent || 0, 10) || 0) * 2 + 0.4}em"` : "";
				let dir = "";
				if (!numeric && v != null) {
					const plain = String(v).replace(/<[^>]+>/g, "");
					const ar = (plain.match(/[\u0600-\u06FF\u0750-\u077F]/g) || []).length, la = (plain.match(/[A-Za-z]/g) || []).length;
					dir = ar && !la ? "rtl" : "";
				}
				if (cfg.pdf && dir === "rtl" && !/[<>&]/.test(String(v))) {
					const [wmm] = paper(cfg), per = Math.max(Math.floor(((wmm - 20) * 96 / 25.4 * wpct[ci] / 100 - 14) / (cfg.fs * 96 / 72 * 0.5)), 6);
					v = manualWrap(String(v), per);
				}
				const side = cfg.rtl ? "right" : "left";
				const indent = c._index == 0 && !row.is_total_row ? `padding-${side}:${(parseInt(row.indent || 0, 10) || 0) * 2 + 0.4}em;` : "";
				const sty = !numeric ? ` style="${indent}text-align:${side}"` : "";
				h += `<td class="${numeric ? "n" : ""}"${dir ? ` dir="${dir}"` : ""}${sty}>${v == null ? "" : v}</td>`;
			});
			h += "</tr>";
		});
		return h + "</tbody></table>";
	}
	/* Oracle-style page header: logo + company on one side, centred report title and period, report date and page
	   number on the other side; the first page also carries the boxed "Report Parameters". */
	function headerHtml(cfg, opts, ctx, pageNo, total, full) {
		const co = (ctx && ctx.company) || {};
		const ps = opts.print_settings || {};
		const letterhead = !!ps.letter_head;
		const f = opts.filters || {};
		const per = periodText(cfg, f);
		const now = frappe.datetime.str_to_user(frappe.datetime.now_datetime());
		const logo = cfg.logo && co.logo && !letterhead ? `<img class="logo" src="${esc(co.logo.startsWith("/") ? window.location.origin + co.logo : co.logo)}" alt="">` : "";
		const company = co.name || f.company;
		const brand = letterhead ? "" : [
			logo, company && `<bdi>${esc(company)}</bdi>`,
			co.tax_id && `<span class="co-s">${tr(cfg, "tax")}: <bdi>${esc(co.tax_id)}</bdi></span>`
		].filter(Boolean).join(" &nbsp; ");
		const period = esc(per).replace(/\d+(?:[./-]\d+){2}/g, (date) => `<span class="date-token">${date}</span>`);
		const currency = co.currency ? `<div class="sub">${tr(cfg, "currency")}: <bdi>${esc(co.currency)}</bdi></div>` : "";
		let h = `<table class="report-head" role="presentation"><tr><td class="identity">
			${brand ? `<div class="co">${brand}</div>` : ""}
			<div class="ttl">${esc(opts.title)}</div>${period ? `<div class="sub">${period}</div>` : ""}
			</td><td class="stamp"><div class="stamp-label">${tr(cfg, "report_date")}</div>
			<span class="stamp-value" dir="ltr">${esc(now)}</span>${currency}
			${pageNo ? `<div class="folio">${tr(cfg, "page")} ${pageNo} ${tr(cfg, "of")} ${total}</div>` : ""}
			</td></tr></table>`;
		if (full && ps.include_filters !== 0 && ps.include_filters !== false) {
			const pairs = filterPairs(cfg, opts.report, f);
			if (pairs.length) {
				h += `<table class="parbox"><tr><th colspan="4">${tr(cfg, "params")}</th></tr>`;
				for (let i = 0; i < pairs.length; i += 2) {
					const row = pairs.slice(i, i + 2);
					h += `<tr>${row.map((p) => `<td class="k">${esc(p[0])}</td><td class="v">${esc(p[1])}</td>`).join("")}${row.length < 2 ? '<td class="k"></td><td class="v"></td>' : ""}</tr>`;
				}
				h += `</table>`;
			}
		}
		return h;
	}
	/* Footer: user, print date and page number. wkhtmltopdf builds without the patched Qt (like the one on this server)
	   cannot repeat a footer, so in PDF mode every page chunk carries its own footer pinned to the bottom of the page and
	   the page numbers are known because we decide the page breaks. In browser print mode the footer is fixed (repeats on
	   every sheet) and the page number comes from the @page margin box. */
	function footerHtml(cfg, ctx, pdf, n, total) {
		const user = (ctx && ctx.user && ctx.user.full_name) || frappe.session.user_fullname || frappe.session.user;
		const now = frappe.datetime.str_to_user(frappe.datetime.now_datetime());
		const parts = [];
		if (cfg.user) parts.push(`${tr(cfg, "printed_by")}: ${esc(user)}`);
		if (cfg.date) parts.push(`${tr(cfg, "printed_on")}: ${esc(now)}`);
		const pg = pdf ? `${tr(cfg, "page")} ${n} ${tr(cfg, "of")} ${total}` : "";
		const inner = `<table><tr><td class="e0">${parts[0] || ""}</td><td class="c">${pg}</td><td class="e">${parts[1] || ""}</td></tr></table>`;
		return `<div class="foot ${pdf ? "abs" : "fix"}">${inner}</div>`;
	}
	function render(opts) {
		const st = cur || {};
		const cfg = Object.assign({}, st.cfg || resolve(opts.print_settings));
		const pdf = st.mode === "pdf";
		cfg.pdf = pdf;
		let cols = columnsFor(opts, cfg);
		try {
			// same column choice as the stock grid (visible columns, or the ones picked in the dialog), even when the
			// caller passed the full column list because a bundled HTML format was selected
			if (opts.report && opts.report.get_columns_for_print) {
				const c2 = opts.report.get_columns_for_print(opts.print_settings, null).filter((c) => c.name && c._id !== "_check");
				if (c2.length) cols = c2;
			}
		} catch (e) { /* keep the given columns */ }
		const data = opts.data || [];
		const wres = widths(cols, data, cfg);
		const wpct = wres.pct;
		cfg.fs = fitFont(wres.chars, cols.length, cfg);
		let body;
		if (pdf) {
			// Allow for the fixed-size report header independently of the table font.
			const nPairs = opts.print_settings && opts.print_settings.include_filters === 0 ? 0 : Object.keys(opts.filters || {}).length;
			const chunks = chunkRows(data, cols, wpct, cfg, 120 + Math.ceil(nPairs / 2) * 20 + (nPairs ? 28 : 0) + (opts.print_settings && opts.print_settings.letter_head ? 90 : 0));
			let start = 0;
			const total = Math.max(chunks.length, 1), hmm = paper(cfg)[1] - 26 - 4;
			const mk = (c, i) => { const t = `<div class="chunk${i ? " brk" : ""}" style="min-height:${hmm}mm">${headerHtml(cfg, opts, st.ctx, i + 1, total, !i)}${tableHtml(cols, wpct, c, data, cfg, start)}${footerHtml(cfg, st.ctx, true, i + 1, total)}</div>`; start += c.length; return t; };
			body = chunks.length ? chunks.map(mk).join("") : mk([], 0);
		} else {
			body = tableHtml(cols, wpct, data, data, cfg, 0);
		}
		const html = `<style>${css(cfg)}</style><div class="uts-rp ${cfg.rtl ? "rtl" : "ltr"}">${pdf ? "" : headerHtml(cfg, opts, st.ctx, 0, 0, true)}${body}${pdf ? "" : footerHtml(cfg, st.ctx, false)}</div>`;
		return pdf ? isolateLatin(html) : html;
	}

	/* ------------------------------------------------------------ plumbing */
	function register() {
		frappe.templates = frappe.templates || {};
		frappe.templates.uts_report_print = "{%= frappe.uts.reportPrint.render({title: title, subtitle: subtitle, filters: filters, data: data, columns: columns, report: report, print_settings: print_settings, original_data: original_data}) %}";
	}
	function applies(report, ps, custom) {
		// A Print Format the user picked explicitly always wins. A report's own bundled HTML format (ERPNext ships one
		// for General Ledger, Accounts Receivable, ...) is just its default look, so the Oracle style replaces it.
		if ((ps && ps.print_format) || !cur || !cur.ctx || !cur.ctx.applies) return false;
		return cur.cfg.style !== "standard";
	}
	async function prepare(report, ps, mode) {
		cur = null;
		try {
			const cfg = resolve(ps);
			const company = (report.get_filter_values && report.get_filter_values().company) || "";
			const key = report.report_name + "|" + company;
			let ctx = cache[key] && Date.now() - cache[key].t < 60000 ? cache[key].v : null;
			if (!ctx) {
				const r = await frappe.call({ method: "universal_theme_studio.print_studio.report_api.report_context", args: { report_name: report.report_name, company } });
				ctx = r.message || { applies: 0 };
				cache[key] = { t: Date.now(), v: ctx };
			}
			cur = { mode, ctx, cfg };
			// page size / orientation chosen for this print (the PDF endpoint reads orientation from the dialog)
		} catch (e) { cur = null; }
	}
	function wrapQueryReport(QR) {
		if (!QR || !QR.prototype || QR.prototype.__uts_rp) return QR;
		const P = QR.prototype, o = { gt: P.get_print_template, pr: P.print_report, pdf: P.pdf_report };
		P.__uts_rp = true;
		P.get_print_template = function (ps, custom) {
			try { if (applies(this, ps, custom)) { register(); return "uts_report_print"; } } catch (e) { /* standard */ }
			return o.gt.call(this, ps, custom);
		};
		P.print_report = async function (ps) { await prepare(this, ps, "print"); try { return await o.pr.call(this, ps); } finally { cur = null; } };
		P.pdf_report = async function (ps) { await prepare(this, ps, "pdf"); try { return await o.pdf.call(this, ps); } finally { cur = null; } };
		return QR;
	}
	function wrapDialog(orig) {
		if (!orig || orig.__uts) return orig;
		const w = function (pdf, callback, letter_head, pick_columns, is_query_report) {
			const b = boot(), org = b.org || {};
			let inScope = false;
			try { inScope = !!org.enabled && (org.all_reports || (frappe.query_report && frappe.query_report.report_doc && frappe.query_report.report_doc.module === "Accounts")); } catch (e) { inScope = false; }
			if (!is_query_report || !inScope) return orig.apply(this, arguments);
			const op = frappe.prompt, self = this, args = arguments;
			frappe.prompt = function (columns, cb, title) {
				frappe.prompt = op;
				const cfg = resolve(null), allow = !!org.allow_prefs;
				columns = columns.map((c) => (c.fieldname === "orientation" ? Object.assign({}, c, { default: cfg.orientation }) : c));
				const idx = Math.max(0, columns.findIndex((c) => c.fieldname === "orientation") + 1);
				const extra = [
					{ fieldtype: "Select", fieldname: "uts_style", label: __("Report Style"), options: [...Object.values(STYLES), STD].map((v) => ({ value: v, label: __(v) })), default: ({ ...STYLES, standard: STD })[cfg.style] },
					{ fieldtype: "Select", fieldname: "uts_page_size", label: __("Page Size"), options: ["A4", "A3"], default: cfg.page },
					{ fieldtype: "Select", fieldname: "uts_font", label: __("Font"), options: ["Tajawal", "Cairo"], default: cfg.font },
					{ fieldtype: "Check", fieldname: "uts_rownum", label: __("Show row numbers"), default: cfg.rownum ? 1 : 0 },
				];
				if (allow) extra.push({ fieldtype: "Check", fieldname: "uts_remember", label: __("Remember my choices"), default: 0 });
				columns.splice(idx, 0, ...extra);
				return op.call(this, columns, function (settings) {
					if (allow && settings.uts_remember) {
						frappe.call({ method: "universal_theme_studio.print_studio.report_api.save_preference", type: "POST", args: { report_style: settings.uts_style, page_size: settings.uts_page_size, orientation: settings.orientation, font: settings.uts_font, show_rownum: settings.uts_rownum ? 1 : 0 } })
							.then((r) => { if (r.message) frappe.boot.uts.report_print = r.message; });
					}
					return cb.apply(this, arguments);
				}, title);
			};
			try { return orig.apply(self, args); } finally { frappe.prompt = op; }
		};
		w.__uts = true;
		return w;
	}
	function trap(obj, key, fn) {
		try {
			let v = obj[key];
			if (v) { const r = fn(v); if (r) v = r; }
			Object.defineProperty(obj, key, { configurable: true, get: () => v, set: (x) => { v = fn(x) || x; } });
		} catch (e) { /* reports keep printing the standard way */ }
	}
	register();
	frappe.ui = frappe.ui || {};
	trap(frappe.ui, "get_print_settings", wrapDialog);
	frappe.views = frappe.views || {};
	trap(frappe.views, "QueryReport", wrapQueryReport);

	/* exposed for the settings preview and tests */
	uts.reportPrint = {
		render, resolve, css,
		/* test hook: render with explicit state (used by the Node test harness) */
		__renderWith(x) { cur = { mode: x.mode, ctx: x.ctx, cfg: resolve(x.ps) }; const h = render(x.opts); cur = null; return h; },
		/* sample report for the live preview in Print Designer Settings */
		preview(over) {
			const ps = Object.assign({}, over || {});
			cur = { mode: "print", ctx: { applies: 1, company: { name: __("Sample Company"), tax_id: "300123456700003", currency: "LYD" }, user: { full_name: frappe.session.user_fullname } }, cfg: resolve(ps) };
			const cols = [
				{ name: __("Account"), fieldname: "account", fieldtype: "Data", _index: 0, _id: "account" },
				{ name: __("Debit"), fieldname: "debit", fieldtype: "Currency", _index: 1, _id: "debit" },
				{ name: __("Credit"), fieldname: "credit", fieldtype: "Currency", _index: 2, _id: "credit" },
				{ name: __("Balance"), fieldname: "balance", fieldtype: "Currency", _index: 3, _id: "balance" },
			].map((c) => Object.assign(c, c.fieldtype === "Currency" ? { format: (v) => (v == null ? "" : Number(v).toLocaleString("en-US", { minimumFractionDigits: 3 })) } : {}));
			const rows = [
				{ account: "1000 - Assets", debit: 150000, credit: 20000, balance: 130000, bold: 1, indent: 0 },
				{ account: "1100 - Cash", debit: 90000, credit: 10000, balance: 80000, indent: 1 },
				{ account: "1200 - Bank", debit: 60000, credit: 10000, balance: 50000, indent: 1 },
				{ account: "2000 - Liabilities", debit: 5000, credit: 45000, balance: -40000, bold: 1, indent: 0 },
				{ account: "4000 - Revenue", debit: 0, credit: 90000, balance: -90000, indent: 0 },
				{ account: __("Total"), debit: 155000, credit: 155000, balance: 0, is_total_row: true },
			].map((r, i) => Object.assign(r, { _index: i }));
			const html = render({ title: __("Trial Balance"), data: rows, columns: cols, filters: { company: __("Sample Company"), from_date: "2026-01-01", to_date: "2026-12-31" }, report: null, print_settings: ps });
			cur = null;
			return html;
		},
	};
})();
