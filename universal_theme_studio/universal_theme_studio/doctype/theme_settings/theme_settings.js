frappe.ui.form.on("Theme Settings", {
	refresh(frm) {
		frm.add_custom_button(__("Open Theme Studio"), () => frappe.set_route("theme-gallery"));
		frm.add_custom_button(__("Reset Colors"), () => {
			frm.set_value({ primary_color: "", accent_color: "" });
		}, __("Actions"));
		uts_login_preview.mount(frm);
	},
	after_save() {
		// Re-read boot settings and repaint immediately, without a page reload.
		frappe.call("universal_theme_studio.api.get_settings").then((r) => {
			frappe.boot.uts = Object.assign(frappe.boot.uts || {}, r.message);
			frappe.uts && frappe.uts.refresh();
		});
	},
});

/* Login Designer live preview: an iframe of /uts_login_preview (admin-only, inert) that receives the form's
   current, unsaved values over postMessage (same origin). Nothing is saved until the form is saved. */
const uts_login_preview = (() => {
	const SIX = {
		"Fiori Blue": "fiori-blue", "Redwood Purple": "redwood-purple", "Emerald Modern": "emerald-modern",
		"Midnight Pro": "midnight-pro", "Sandstone Premium": "sandstone-premium",
		"Ocean Breeze": "ocean-breeze", "Sunset Fusion": "sunset-fusion", "Forest Harmony": "forest-harmony",
		"Royal Indigo": "royal-indigo", "Modern Teal": "modern-teal", "Carbon Pro": "carbon-pro",
	};
	const THEME_KEYS = Object.assign({
		"Fiori Blue": "fiori-blue", "Redwood Purple": "redwood-purple", "Emerald Modern": "emerald-modern",
		"Midnight Pro": "midnight-pro", "Sandstone Premium": "sandstone-premium",
	}, SIX);
	const RADIUS = { Sharp: 6, Rounded: 14, Soft: 22, "Extra Soft": 32 };
	const POS = { Start: "start", Center: "center", End: "end" };
	const DEFAULT_TEXT = {
		en: ["Welcome back", "Sign in to continue to your workspace."],
		ar: ["مرحبًا بعودتك", "سجّل دخولك للمتابعة إلى مساحة عملك."],
	};
	const DEFAULT_FEATURES = [
		["shield", ["Secure access", "Your data is protected end to end."], ["وصول آمن", "بياناتك محمية بالكامل."]],
		["chart", ["Live insights", "Dashboards and reports in real time."], ["رؤى فورية", "لوحات وتقارير لحظية."]],
		["globe", ["Arabic & English", "Full right-to-left support."], ["عربي وإنجليزي", "دعم كامل للاتجاهين."]],
	];
	const COLOR_RE = /^(#[0-9a-fA-F]{3,8}|rgba?\([\d\s.,%/]+\))$/;
	const DEVICES = { desktop: [1280, 760], tablet: [820, 1000], mobile: [390, 820] };
	const FIELDS = ["login_design", "login_card_position", "login_card_radius", "login_glass", "login_show_features", "login_title",
		"login_subtitle", "login_title_ar", "login_subtitle_ar", "login_overlay", "login_background_image", "login_logo",
		"login_card_color", "login_button_color", "default_theme", "login_layout"];

	const state = { device: "desktop", lang: "en", timer: null, ready: false };

	function cfg(frm) {
		const d = frm.doc;
		let design = "classic";
		const sel = d.login_design || "Match Organization Theme";
		if (sel === "Native Frappe Login") design = "native";
		else if (sel.startsWith("Classic")) design = "classic";
		else if (SIX[sel]) design = SIX[sel];
		else design = SIX[d.default_theme] ? SIX[d.default_theme] : "classic";
		const orgTheme = THEME_KEYS[d.default_theme] || "fiori-blue";
		const text = (l, col) => ({
			title: (d["login_title" + col] || "").trim().slice(0, 140) || DEFAULT_TEXT[l][0],
			subtitle: (d["login_subtitle" + col] || "").trim().slice(0, 300) || DEFAULT_TEXT[l][1],
		});
		let features = (d.login_features || []).slice(0, 3).map((r) => ({
			icon: r.icon || "shield",
			en: { title: r.title || "", text: r.text || "" },
			ar: { title: r.title_ar || "", text: r.text_ar || "" },
		}));
		if (!features.length) features = DEFAULT_FEATURES.map(([icon, en, ar]) => ({ icon, en: { title: en[0], text: en[1] }, ar: { title: ar[0], text: ar[1] } }));
		const color = (v) => (v && COLOR_RE.test(String(v).trim()) ? String(v).trim() : "");
		return {
			design,
			theme: Object.values(SIX).includes(design) ? design : orgTheme,
			position: POS[d.login_card_position] || "design",
			radius: RADIUS[d.login_card_radius] || 0,
			glass: Math.min(Math.max(parseInt(d.login_glass ?? 50, 10) || 0, 0), 100),
			overlay: Math.min(Math.max(parseInt(d.login_overlay ?? 35, 10) || 0, 0), 100) / 100,
			showFeatures: !!d.login_show_features,
			image: d.login_background_image || "",
			logo: d.login_logo || "",
			cardColor: color(d.login_card_color),
			buttonColor: color(d.login_button_color),
			texts: { en: text("en", ""), ar: text("ar", "_ar") },
			features,
		};
	}

	function post(frm) {
		const w = frm.__uts_prev && frm.__uts_prev.find("iframe")[0];
		if (w && w.contentWindow && state.ready) w.contentWindow.postMessage({ type: "uts-login-preview", cfg: cfg(frm) }, window.location.origin);
	}
	function schedule(frm) { clearTimeout(state.timer); state.timer = setTimeout(() => post(frm), 150); }

	function layout(frm) {
		const $w = frm.__uts_prev; if (!$w) return;
		const [w, h] = DEVICES[state.device];
		const avail = Math.max($w.find(".uts-pv-stage").width() || 700, 320);
		const k = Math.min(1, avail / w);
		$w.find("iframe").css({ width: w + "px", height: h + "px", transform: `scale(${k})` });
		$w.find(".uts-pv-frame").css({ width: Math.round(w * k) + "px", height: Math.round(h * k) + "px" });
		$w.find("[data-device]").removeClass("btn-primary").addClass("btn-default").filter(`[data-device="${state.device}"]`).removeClass("btn-default").addClass("btn-primary");
		$w.find("[data-lang]").removeClass("btn-primary").addClass("btn-default").filter(`[data-lang="${state.lang}"]`).removeClass("btn-default").addClass("btn-primary");
	}

	function mount(frm) {
		const fld = frm.fields_dict.login_preview;
		if (!fld) return;
		if (!frm.__uts_prev) {
			const $w = $(`<div class="uts-pv">
				<div class="uts-pv-bar">
					<span class="btn-group">${Object.keys(DEVICES).map((d) => `<button type="button" class="btn btn-xs btn-default" data-device="${d}">${__(d[0].toUpperCase() + d.slice(1))}</button>`).join("")}</span>
					<span class="btn-group"><button type="button" class="btn btn-xs btn-default" data-lang="en">English</button><button type="button" class="btn btn-xs btn-default" data-lang="ar">العربية</button></span>
					<span class="text-muted small">${__("Preview only: nothing is saved until you save the form.")}</span>
				</div>
				<div class="uts-pv-stage"><div class="uts-pv-frame"><iframe title="${__("Login preview")}" loading="lazy"></iframe></div></div>
			</div>`).appendTo(fld.$wrapper.empty());
			frm.__uts_prev = $w;
			$w.on("click", "[data-device]", function () { state.device = $(this).data("device"); layout(frm); });
			$w.on("click", "[data-lang]", function () { state.lang = $(this).data("lang"); load(frm); });
			window.addEventListener("message", (ev) => {
				if (ev.origin !== window.location.origin || !ev.data || ev.data.type !== "uts-login-ready") return;
				state.ready = true; post(frm);
			});
			$(window).on("resize.utspv", () => layout(frm));
			FIELDS.forEach((f) => frm.fields_dict[f] && frm.fields_dict[f].$input && frm.fields_dict[f].$input.on("change input", () => schedule(frm)));
			// any value change (incl. colour pickers, attach, checkboxes) and the feature-card rows
			frappe.ui.form.on("Theme Settings", Object.assign({}, ...FIELDS.map((f) => ({ [f]: () => schedule(frm) })), { login_features_add: () => schedule(frm), login_features_remove: () => schedule(frm) }));
			frappe.ui.form.on("Login Feature", { icon: () => schedule(frm), title: () => schedule(frm), title_ar: () => schedule(frm), text: () => schedule(frm), text_ar: () => schedule(frm) });
			load(frm);
		}
		layout(frm);
	}
	function load(frm) {
		state.ready = false;
		frm.__uts_prev.find("iframe").attr("src", `/uts_login_preview?uts_preview=1&_lang=${state.lang}`);
		layout(frm);
	}
	return { mount };
})();
