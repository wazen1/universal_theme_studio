frappe.ui.form.on("Print Designer Settings", {
	refresh(frm) {
		frm.add_custom_button(__("Open Print Studio"), () => frappe.set_route("theme-gallery"));
		uts_print_preview.mount(frm);
		uts_report_preview.mount(frm);
	},
});

/* Preview of the Oracle report styles with a sample trial balance. Uses the unsaved form values; same renderer as the
   real report print (public/js/report_print.js). */
const uts_report_preview = (() => {
	const FIELDS = ["report_style", "report_page_size", "report_orientation", "report_font", "report_language", "report_show_rownum"];
	let timer = null, wired = false;
	function draw(frm) {
		const $w = frm.__uts_rp; if (!$w || !frappe.uts || !frappe.uts.reportPrint) return;
		const d = frm.doc, ar = (d.report_language === "Arabic") || (d.report_language !== "English" && (frappe.boot.lang || "").startsWith("ar"));
		const rp = frappe.boot.uts.report_print = frappe.boot.uts.report_print || { org: {}, user: {} };
		const saved = JSON.stringify(rp.org);
		rp.org = Object.assign({}, rp.org, { lang: ar ? "ar" : "en", font: d.report_font, show_rownum: d.report_show_rownum ? 1 : 0, show_logo: d.report_show_logo ? 1 : 0, show_user: d.report_show_user ? 1 : 0, show_date: d.report_show_date ? 1 : 0 });
		const html = frappe.uts.reportPrint.preview({ uts_style: d.report_style, uts_page_size: d.report_page_size, orientation: d.report_orientation, uts_font: d.report_font });
		rp.org = JSON.parse(saved);
		const dims = (d.report_page_size === "A3" ? [297, 420] : [210, 297]);
		const [w, h] = d.report_orientation === "Landscape" ? [dims[1], dims[0]] : dims;
		const px = 3.78, W = Math.round(w * px), H = Math.round(h * px);
		const k = Math.min(1, Math.max($w.find(".uts-ps-stage").width() || 700, 300) / W);
		$w.find("iframe").attr("srcdoc", `<!doctype html><html dir="${ar ? "rtl" : "ltr"}"><head><meta charset="utf-8"><style>body{margin:0;background:#fff}.pg{padding:12mm 10mm}</style></head><body><div class="pg">${html}</div></body></html>`)
			.css({ width: W + "px", height: H + "px", transform: `scale(${k})` });
		$w.find(".uts-ps-frame").css({ width: Math.round(W * k) + "px", height: Math.round(H * k) + "px" });
	}
	function schedule(frm) { clearTimeout(timer); timer = setTimeout(() => draw(frm), 250); }
	function mount(frm) {
		const fld = frm.fields_dict.report_preview; if (!fld) return;
		if (!frm.__uts_rp) {
			frm.__uts_rp = $(`<div class="uts-ps"><div class="text-muted small" style="margin-bottom:6px">${__("Preview only: nothing is saved until you save the form.")}</div>
				<div class="uts-ps-stage"><div class="uts-ps-frame"><iframe title="${__("Report print preview")}" sandbox="allow-same-origin"></iframe></div></div></div>`).appendTo(fld.$wrapper.empty());
			if (!wired) {
				wired = true;
				frappe.ui.form.on("Print Designer Settings", Object.assign({}, ...FIELDS.map((f) => ({ [f]: (f2) => schedule(f2) }))));
			}
		}
		draw(frm);
	}
	return { mount };
})();

/* Live preview: renders a real document through the server-side print engine (same code as the Print Format and PDF),
   sending the form's current, unsaved values as validated overrides. Nothing is saved until the form is saved. */
const uts_print_preview = (() => {
	const API = "universal_theme_studio.print_studio.api.";
	const FIELDS = ["default_design", "language_mode", "paper_size", "orientation", "margins", "primary_color", "secondary_color",
		"font_family", "font_size", "table_style", "decorative_patterns", "ink_saving", "logo", "header_text", "footer_text",
		"show_qr", "qr_content", "show_signature", "signature_labels"];
	const st = { dt: "Sales Invoice", name: null, timer: null, seq: 0, wired: false };

	function overrides(frm) {
		const o = {};
		FIELDS.forEach((f) => { o[f] = frm.doc[f]; });
		return o;
	}
	function layout(frm) {
		const $w = frm.__uts_pp; if (!$w) return;
		const W = (frm.doc.orientation === "Landscape") ? 1123 : 794, H = (frm.doc.orientation === "Landscape") ? 794 : 1123;
		const k = Math.min(1, Math.max($w.find(".uts-ps-stage").width() || 700, 300) / W);
		$w.find("iframe").css({ width: W + "px", height: H + "px", transform: `scale(${k})` });
		$w.find(".uts-ps-frame").css({ width: Math.round(W * k) + "px", height: Math.round(H * k) + "px" });
	}
	function render(frm) {
		const $w = frm.__uts_pp; if (!$w) return;
		const $m = $w.find(".uts-ps-msg");
		if (!st.name) { $m.text(__("No {0} documents available to preview.", [__(st.dt)])); return; }
		const seq = ++st.seq;
		$m.text(__("Loading…"));
		frappe.call({
			method: API + "preview",
			args: { doctype: st.dt, name: st.name, design: frm.doc.default_design, overrides: overrides(frm) },
		}).then((r) => {
			if (seq !== st.seq) return;
			$m.text("");
			$w.find("iframe").attr("srcdoc", r.message || "");
			layout(frm);
		}, () => $m.text(__("Preview failed.")));
	}
	function schedule(frm) { clearTimeout(st.timer); st.timer = setTimeout(() => render(frm), 350); }
	function loadDocs(frm) {
		const $w = frm.__uts_pp;
		return frappe.call({ method: API + "sample_docs", args: { doctype: st.dt } }).then((r) => {
			const docs = r.message || [];
			const $s = $w.find("[data-f=name]").empty();
			docs.forEach((d) => $s.append($("<option>").val(d.name).text(d.name)));
			st.name = docs.length ? docs[0].name : null;
		}, () => { st.name = null; });
	}
	function mount(frm) {
		const fld = frm.fields_dict.preview;
		if (!fld) return;
		if (!frm.__uts_pp) {
			const $w = $(`<div class="uts-ps">
				<div class="uts-ps-bar">
					<label>${__("Document type")}<select class="form-control input-sm" data-f="dt"></select></label>
					<label>${__("Document")}<select class="form-control input-sm" data-f="name"></select></label>
					<span class="text-muted small">${__("Preview only: nothing is saved until you save the form.")}</span>
				</div>
				<div class="uts-ps-stage"><div class="uts-ps-frame"><iframe title="${__("Print preview")}" sandbox="allow-same-origin"></iframe></div><div class="uts-ps-msg text-muted"></div></div>
			</div>`).appendTo(fld.$wrapper.empty());
			frm.__uts_pp = $w;
			frappe.call({ method: API + "gallery_data" }).then((r) => {
				const $s = $w.find("[data-f=dt]");
				(r.message.doctypes || []).forEach((d) => $s.append($("<option>").val(d.doctype).text(__(d.doctype))));
				$s.val(st.dt);
			});
			$w.on("change", "[data-f=dt]", function () { st.dt = this.value; loadDocs(frm).then(() => render(frm)); });
			$w.on("change", "[data-f=name]", function () { st.name = this.value; render(frm); });
			$(window).on("resize.utspp", () => layout(frm));
			if (!st.wired) {
				st.wired = true;
				frappe.ui.form.on("Print Designer Settings", Object.assign({}, ...FIELDS.map((f) => ({ [f]: (f2) => schedule(f2) }))));
			}
			loadDocs(frm).then(() => render(frm));
		}
		layout(frm);
	}
	return { mount };
})();
