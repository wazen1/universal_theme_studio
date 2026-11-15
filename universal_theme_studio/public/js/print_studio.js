/* Print view (/app/print/...): list the six Print Studio designs in the "Style" picker.
   Standard format: choosing one switches to that DocType's "Print Studio - <DocType>" format.
   Print Studio format: the picker shows only the six designs and the choice is sent as the style parameter
   (the server maps it to the design). Core files are untouched: the PrintView class is wrapped when it loads. */
(function () {
	const PREFIX = "Print Studio - ";
	const NAMES = ["Classic Gold", "Modern Blue", "Elegant Teal", "Purple Wave", "Executive Document", "Creative Corporate", "Business Classic", "Info Card", "Full Band", "Number Tile"];
	const studio = (pv) => (pv.selected_format() || "").startsWith(PREFIX);
	function patch(PV) {
		if (!PV || !PV.prototype || PV.prototype.__uts_patched) return PV;
		const P = PV.prototype, orig = {
			render: P.render_style_options, toggle: P.toggle_style_picker, get: P.get_print_style,
		};
		P.__uts_patched = true;
		P.get_print_style = function () {
			if (studio(this)) return NAMES.includes(this.print_style) ? this.print_style : "";
			const s = orig.get.call(this);
			return NAMES.includes(s) ? "" : s;
		};
		P.render_style_options = function () {
			if (studio(this)) {
				const all = this.print_styles;
				this.print_styles = (all || []).filter((n) => NAMES.includes(n));
				try { orig.render.call(this); } finally { this.print_styles = all; }
			} else orig.render.call(this);
			this.style_picker && this.style_picker.find(".print-style-option").off("click.uts").on("click.uts", (e) => {
				const name = e.currentTarget.dataset.style;
				if (!NAMES.includes(name) || studio(this)) return;
				e.stopImmediatePropagation();
				const fmt = PREFIX + this.frm.doctype;
				this.print_style = name;
				if (this.print_formats && !(this.print_formats.find ? this.print_formats.find((f) => f.name === fmt) : true)) return;
				this.print_format_field && this.print_format_field.set_input(fmt);
				this.print_format_selector && this.print_format_selector.val(fmt);
				this.render_style_options();
				this.preview();
			});
		};
		P.toggle_style_picker = function () {
			if (studio(this)) {
				this.style_picker && this.style_picker.toggle(true);
				this.page_settings && this.page_settings.toggle(!this.get_print_format().raw_printing);
			} else orig.toggle.call(this);
		};
		return PV;
	}
	try {
		let cur = frappe.ui.form.PrintView;
		if (cur) patch(cur);
		Object.defineProperty(frappe.ui.form, "PrintView", { configurable: true, get: () => cur, set: (v) => { cur = patch(v); } });
	} catch (e) { /* print view keeps working unpatched */ }
})();

/* Universal Theme Studio - Print Format Studio tab (admin only, inside Theme Studio).
   Gallery of the six print designs, per-DocType assignment, live preview with a real document, Print / PDF.
   All data comes from whitelisted, permission-checked endpoints; nothing here accepts HTML or CSS. */
(function () {
	const uts = (window.frappe && frappe.uts) || null;
	if (!uts || !uts.ui) return;
	const API = "universal_theme_studio.print_studio.api.";
	const isAR = () => (frappe.boot && frappe.boot.lang || "en").startsWith("ar");
	const esc = (s) => frappe.utils.escape_html(String(s == null ? "" : s));
	const NAMES_AR = {
		"classic-gold": "ذهبي كلاسيكي", "modern-blue": "أزرق عصري", "elegant-teal": "تركوازي أنيق",
		"purple-wave": "موجة بنفسجية", "executive-document": "مستند تنفيذي", "creative-corporate": "مؤسسي إبداعي", "business-classic": "كلاسيكي أعمال", "info-card": "بطاقة المعلومات", "full-band": "الشريط الكامل", "number-tile": "المربع المميز",
	};

	function mountPrint($host) {
		const st = { data: null, doctype: null, name: null, design: null, lang: "", ink: 0, docs: [], seq: 0 };
		const label = (d) => (isAR() && NAMES_AR[d.key]) || d.label;

		const $root = $(`<div class="uts-ps">
			<div class="uts-ps-bar">
				<label>${__("Document type")}<select class="form-control input-sm" data-f="doctype"></select></label>
				<label>${__("Document")}<select class="form-control input-sm" data-f="name"></select></label>
				<label>${__("Language")}<select class="form-control input-sm" data-f="lang">
					<option value="">${__("As configured")}</option><option value="ar">العربية</option>
					<option value="en">English</option><option value="both">${__("Bilingual")}</option></select></label>
				<label class="uts-ps-chk"><input type="checkbox" data-f="ink"> ${__("Ink saving")}</label>
				<span class="uts-ps-sp"></span>
				<button class="btn btn-default btn-sm" data-act="settings">${__("Print Designer Settings")}</button>
				<button class="btn btn-default btn-sm" data-act="print">${__("Print")}</button>
				<button class="btn btn-primary btn-sm" data-act="pdf">${__("PDF")}</button>
			</div>
			<div class="uts-ps-cards"></div>
			<div class="uts-ps-actions"></div>
			<div class="uts-ps-stage"><div class="uts-ps-frame"><iframe title="${__("Print preview")}" sandbox="allow-same-origin"></iframe></div><div class="uts-ps-msg text-muted"></div></div>
			<h6 class="uts-ps-h">${__("Default design per document type")}</h6>
			<table class="uts-ps-table"><thead><tr><th>${__("Document type")}</th><th>${__("Design")}</th><th>${__("Use as default print format")}</th></tr></thead><tbody></tbody></table>
		</div>`).appendTo($host.empty());

		const $msg = $root.find(".uts-ps-msg");
		const cur = () => st.data.doctypes.find((d) => d.doctype === st.doctype);
		const effective = () => st.design || (cur() && cur().design) || st.data.default_design;

		function drawCards() {
			const eff = effective();
			$root.find(".uts-ps-cards").html(st.data.designs.map((d) => `
				<button type="button" class="uts-ps-card${d.key === eff ? " active" : ""}" data-design="${esc(d.key)}">
					<span class="uts-ps-sw" style="background:linear-gradient(135deg,${esc(d.primary)},${esc(d.secondary)})"></span>
					<b>${esc(label(d))}</b>
					<small>${d.key === st.data.default_design ? esc(__("Organization default")) : "&nbsp;"}</small>
				</button>`).join(""));
			const c = cur();
			$root.find(".uts-ps-actions").html(`
				<button class="btn btn-primary btn-sm" data-act="apply">${__("Use this design for {0}", [esc(c ? c.doctype : "")])}</button>
				<button class="btn btn-default btn-sm" data-act="org">${__("Set as organization default")}</button>
				<span class="text-muted small">${c && c.design ? __("Current: {0}", [esc(label(st.data.designs.find((x) => x.key === c.design) || { label: c.design, key: c.design }))]) : __("Current: organization default")}</span>`);
		}
		function drawTable() {
			const opts = (sel) => [`<option value="">${esc(__("Use Default Design"))}</option>`].concat(st.data.designs.map((d) => `<option value="${esc(d.key)}"${d.key === sel ? " selected" : ""}>${esc(label(d))}</option>`)).join("");
			$root.find("tbody").html(st.data.doctypes.map((d) => `<tr data-dt="${esc(d.doctype)}">
				<td>${esc(__(d.doctype))}</td>
				<td><select class="form-control input-sm" data-row="design">${opts(d.design)}</select></td>
				<td><input type="checkbox" data-row="make_default" ${d.make_default ? "checked" : ""}> ${d.is_default ? `<span class="indicator-pill green">${__("Active")}</span>` : ""}</td></tr>`).join(""));
		}
		function fillSelect(sel, items, value) {
			const $s = $root.find(`[data-f="${sel}"]`).empty();
			items.forEach(([v, l]) => $s.append($("<option>").val(v).text(l)));
			if (value != null) $s.val(value);
		}
		function loadDocs() {
			return frappe.call({ method: API + "sample_docs", args: { doctype: st.doctype } }).then((r) => {
				st.docs = r.message || [];
				fillSelect("name", st.docs.map((x) => [x.name, x.name]), st.docs.length ? st.docs[0].name : "");
				st.name = st.docs.length ? st.docs[0].name : null;
			});
		}
		let timer = null;
		function schedule() { clearTimeout(timer); timer = setTimeout(preview, 120); }
		function preview() {
			const $f = $root.find("iframe");
			if (!st.name) {
				$f.attr("srcdoc", ""); $msg.text(__("No {0} documents available to preview.", [__(st.doctype)])); layout(); return;
			}
			$msg.text(__("Loading…"));
			const seq = ++st.seq;
			frappe.call({
				method: API + "preview",
				args: { doctype: st.doctype, name: st.name, design: effective(), lang: st.lang || "", overrides: st.ink ? { ink: 1 } : {} },
			}).then((r) => {
				if (seq !== st.seq) return;
				$msg.text("");
				$f.attr("srcdoc", r.message || "");
				layout();
			}, () => { $msg.text(__("Preview failed.")); });
		}
		function layout() {
			const $f = $root.find("iframe"), W = 794, H = 1123;
			const avail = Math.max($root.find(".uts-ps-stage").width() || 700, 300);
			const k = Math.min(1, avail / W);
			$f.css({ width: W + "px", height: H + "px", transform: `scale(${k})` });
			$root.find(".uts-ps-frame").css({ width: Math.round(W * k) + "px", height: Math.round(H * k) + "px" });
		}
		function url(kind) {
			const c = cur();
			const q = { doctype: st.doctype, name: st.name, format: c.print_format, no_letterhead: 1, uts_design: effective() };
			if (st.lang) q.uts_lang = st.lang;
			if (st.ink) q.uts_ink = 1;
			if (kind === "pdf") return "/api/method/frappe.utils.print_format.download_pdf?" + $.param(q);
			return "/printview?" + $.param(q);
		}
		function reload(data) {
			st.data = data;
			if (!st.doctype || !data.doctypes.find((d) => d.doctype === st.doctype)) st.doctype = data.doctypes[0] && data.doctypes[0].doctype;
			fillSelect("doctype", data.doctypes.map((d) => [d.doctype, __(d.doctype)]), st.doctype);
			drawCards(); drawTable();
		}

		$root.on("change", "[data-f]", function () {
			const f = $(this).data("f");
			if (f === "doctype") { st.doctype = this.value; st.design = null; drawCards(); loadDocs().then(preview); return; }
			if (f === "name") st.name = this.value;
			if (f === "lang") st.lang = this.value;
			if (f === "ink") st.ink = this.checked ? 1 : 0;
			schedule();
		});
		$root.on("click", ".uts-ps-card", function () { st.design = $(this).data("design"); drawCards(); schedule(); });
		$root.on("click", "[data-act]", function () {
			const a = $(this).data("act");
			if (a === "settings") return frappe.set_route("Form", "Print Designer Settings");
			if (a === "print" || a === "pdf") { if (st.name) window.open(url(a), "_blank", "noopener"); return; }
			if (a === "apply") {
				const c = cur();
				return frappe.call({ method: API + "save_assignment", type: "POST", args: { doctype: st.doctype, design: effective(), make_default: c ? c.make_default : 0 }, freeze: true })
					.then((r) => { st.design = null; reload(r.message); frappe.show_alert({ message: __("Design applied"), indicator: "green" }); });
			}
			if (a === "org") {
				return frappe.call({ method: API + "set_default_design", type: "POST", args: { design: effective() }, freeze: true })
					.then((r) => { reload(r.message); frappe.show_alert({ message: __("Organization default updated"), indicator: "green" }); });
			}
		});
		$root.on("change", "[data-row]", function () {
			const $tr = $(this).closest("tr"), dt = $tr.data("dt"), d = st.data.doctypes.find((x) => x.doctype === dt);
			const design = $tr.find('[data-row="design"]').val() || "Use Default Design";
			const md = $tr.find('[data-row="make_default"]').prop("checked") ? 1 : 0;
			frappe.call({ method: API + "save_assignment", type: "POST", args: { doctype: dt, design, make_default: md }, freeze: true })
				.then((r) => { reload(r.message); if (dt === st.doctype) schedule(); frappe.show_alert({ message: __("Saved"), indicator: "green" }); });
		});
		$(window).on("resize.utsps", layout);

		frappe.call({ method: API + "gallery_data" }).then((r) => {
			reload(r.message);
			loadDocs().then(preview);
		});
		return { destroy: () => { clearTimeout(timer); $(window).off("resize.utsps"); } };
	}
	uts.ui.mountPrint = mountPrint;
})();
