/* Universal Theme Studio - desk runtime.
   Sets <html data-uts-theme data-uts-mode> + font variables instantly. Preferences live in the database
   (Theme User Preference, loaded through frappe.boot.uts) - nothing is read from localStorage. */
(function () {
	const root = document.documentElement;
	const THEMES = [
		{ key: "fiori-blue", label: "Fiori Blue", hint: "Clean enterprise blue", p: "#0a6ed1", a: "#e9730c", s: "#f5f6f7" },
		{ key: "redwood-purple", label: "Redwood Purple", hint: "Warm, expressive purple", p: "#6b3fa0", a: "#c74634", s: "#f7f4f2" },
		{ key: "emerald-modern", label: "Emerald Modern", hint: "Fresh and balanced green", p: "#047857", a: "#d97706", s: "#f2f7f5" },
		{ key: "midnight-pro", label: "Midnight Pro", hint: "Focused indigo on slate", p: "#4f46e5", a: "#06b6d4", s: "#f3f5f9" },
		{ key: "sandstone-premium", label: "Sandstone Premium", hint: "Warm neutral with bronze", p: "#8f5f1d", a: "#2f6f6a", s: "#f7f2e9" },
		// v1.4 mixed-colour themes: p = primary, c2 = secondary, a = accent, s = page surface, g = gradient stops
		{ key: "ocean-breeze", label: "Ocean Breeze", hint: "Royal blue, turquoise and cyan glass", p: "#1d4ed8", c2: "#14b8a6", a: "#06b6d4", s: "#eff6fb", g: ["#0b3a8c", "#1d4ed8", "#14b8a6"] },
		{ key: "sunset-fusion", label: "Sunset Fusion", hint: "Vibrant orange, pink and purple", p: "#c2410c", c2: "#db2777", a: "#7c3aed", s: "#fff6f1", g: ["#c2410c", "#db2777", "#7c3aed"] },
		{ key: "forest-harmony", label: "Forest Harmony", hint: "Forest green, lime and beige", p: "#166534", c2: "#84cc16", a: "#a16207", s: "#f6f2e7", g: ["#14532d", "#166534", "#65a30d"] },
		{ key: "royal-indigo", label: "Royal Indigo", hint: "Indigo, violet and soft pink", p: "#4338ca", c2: "#7c3aed", a: "#f472b6", s: "#f5f3ff", g: ["#312e81", "#4f46e5", "#c084fc"] },
		{ key: "modern-teal", label: "Modern Teal", hint: "Teal, cyan and cool gray", p: "#0f766e", c2: "#06b6d4", a: "#64748b", s: "#f1f5f7", g: ["#134e4a", "#0f766e", "#06b6d4"] },
		{ key: "carbon-pro", label: "Carbon Pro", hint: "Charcoal, electric blue and silver", p: "#2563eb", c2: "#38bdf8", a: "#94a3b8", s: "#eef0f3", g: ["#0c0d10", "#1b1f27", "#2563eb"] },
	];
	// Optional abstract wallpaper presets (independent of the theme)
	const PRESETS = [
		{ key: "mint-soft", label: "Mint Soft", tone: "light", g: ["#e9fbf2", "#a7f3d0", "#bae6fd"] },
		{ key: "rose-elegant", label: "Rose Elegant", tone: "light", g: ["#fff3f6", "#fbcfe8", "#e9d5ff"] },
		{ key: "sky-glass", label: "Sky Glass", tone: "light", g: ["#ecf7ff", "#bae6fd", "#c7d2fe"] },
		{ key: "amber-light", label: "Amber Light", tone: "light", g: ["#fff8e8", "#fde68a", "#fecaca"] },
		{ key: "slate-modern", label: "Slate Modern", tone: "dark", g: ["#17202e", "#334155", "#1e3a5f"] },
		{ key: "arctic-white", label: "Arctic White", tone: "light", g: ["#f8fafc", "#e2e8f0", "#dbeafe"] },
	];
	const KEYS = THEMES.map((t) => t.key);
	const boot = () => (window.frappe && frappe.boot && frappe.boot.uts) || {};
	const media = window.matchMedia("(prefers-color-scheme: dark)");

	const uts = {
		themes: THEMES,
		presets: PRESETS,
		// effective values come from the server (user preference, else organization default)
		get eff() { return boot().effective || {}; },
		get theme() {
			const t = this.eff.theme || boot().default_theme;
			return KEYS.includes(t) ? t : "fiori-blue";
		},
		get mode() { return this.eff.mode || boot().default_mode || "light"; },
		get wallpaper() { return this.eff.wallpaper || "theme"; },
		get flags() { return boot().flags || { theme: true, fonts: true, wallpaper: true }; },
		canChooseTheme() { return !!this.flags.theme; },
		canChooseFonts() { return !!this.flags.fonts; },
		canChooseWallpaper() { return !!this.flags.wallpaper; },
		/* themes this user may pick (administrator's list; everything for System Managers) */
		availableThemes() {
			const av = boot().available;
			return av && av.length ? THEMES.filter((t) => av.includes(t.key)) : THEMES;
		},
		get orgDefaults() { return boot().org || {}; },
		resolve(mode) { return mode === "auto" ? (media.matches ? "dark" : "light") : mode; },

		apply(theme, mode, persist) {
			theme = KEYS.includes(theme) ? theme : this.theme;
			mode = mode || this.mode;
			const m = this.resolve(mode);
			root.setAttribute("data-uts-theme", theme);
			root.setAttribute("data-uts-mode", m);
			root.setAttribute("data-uts-mode-pref", mode);
			// keep Frappe's own mode attributes in step with ours, so its theme observer never reads a stale value back
			const fm = mode === "auto" ? "automatic" : m;
			if (root.getAttribute("data-theme") !== m || root.getAttribute("data-theme-mode") !== fm) {
				this._own = true;
				root.setAttribute("data-theme", m);
				root.setAttribute("data-theme-mode", fm);
				this._own = false;
			}
			// Per-theme sidebar style: switching theme restyles the sidebar instantly.
			const sb = (boot().sidebar || {})[theme] || {};
			root.setAttribute("data-uts-sb", sb.appearance || "classic");
			root.setAttribute("data-uts-sb-pattern", sb.pattern || "none");
			root.setAttribute("data-uts-sb-active", sb.active || "rounded-highlight");
			root.setAttribute("data-uts-sb-width", sb.width || "comfortable");
			root.setAttribute("data-uts-sb-icons", sb.icons || "standard");
			this.applyWallpaper(theme);
			if (!this._previewing) this.rememberForLogin(theme);
			if (!this._previewing && boot()) {
				boot().effective = Object.assign({}, boot().effective, { theme, mode });
				if (persist) boot().prefs = Object.assign({}, boot().prefs, { theme, mode });
			}
			if (persist && window.frappe && frappe.session && frappe.session.user !== "Guest") {
				this.save({ theme, mode });
			}
			$(document).trigger("uts:change", [theme, m]);
		},
		/* The login page (before sign-in) can only show a theme that this browser remembers: store the theme NAME only. */
		rememberForLogin(theme) {
			try {
				if (document.cookie.indexOf("uts_login_theme=" + theme) === -1) {
					document.cookie = `uts_login_theme=${theme}; path=/; max-age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
				}
			} catch (e) { /* cookies disabled */ }
		},
		setTheme(theme) { this._previewing = false; this._prev = null; this.apply(theme, this.mode, true); },

		/* Wallpaper preset: user choice > admin default preset (when no uploaded wallpaper) > theme photo */
		applyWallpaper(theme) {
			let key = "";
			const pref = this.wallpaper;
			if (this.canChooseWallpaper() && pref && pref !== "theme") key = pref;
			if (!key && boot().wp_preset) {
				const c = boot().wp_custom || {};
				if (!c.all && !c[theme]) key = boot().wp_preset;
			}
			const p = PRESETS.find((x) => x.key === key);
			if (p) {
				root.setAttribute("data-uts-wp-preset", p.key);
				root.setAttribute("data-uts-wp-tone", p.tone);
			} else {
				root.removeAttribute("data-uts-wp-preset");
				root.removeAttribute("data-uts-wp-tone");
			}
		},
		setWallpaper(key) {
			key = key || "theme";
			if (boot()) {
				boot().effective = Object.assign({}, boot().effective, { wallpaper: key });
				boot().prefs = Object.assign({}, boot().prefs, { wallpaper: key });
			}
			this.applyWallpaper(root.getAttribute("data-uts-theme") || this.theme);
			if (window.frappe && frappe.session && frappe.session.user !== "Guest") this.save({ wallpaper: key });
			$(document).trigger("uts:change", [this.theme, root.getAttribute("data-uts-mode")]);
		},

		/* Preview: apply a theme without saving it; commit or cancel afterwards */
		preview(theme) {
			if (!this._previewing) this._prev = { theme: this.theme, mode: this.mode };
			this._previewing = true;
			this.apply(theme, this.mode, false);
		},
		get previewing() { return this._previewing ? root.getAttribute("data-uts-theme") : null; },
		cancelPreview() {
			if (!this._previewing) return;
			const p = this._prev || { theme: this.theme, mode: this.mode };
			this._previewing = false; this._prev = null;
			this.apply(p.theme, p.mode, false);
		},
		commitPreview() {
			const t = root.getAttribute("data-uts-theme");
			this._previewing = false; this._prev = null;
			this.apply(t, this.mode, true);
		},
		setMode(mode) { this.apply(this.theme, mode, true); },
		toggleMode() { this.setMode(this.resolve(this.mode) === "dark" ? "light" : "dark"); },

/* ---- persistence: every write goes through the validated server API (own preferences only) ---- */
		save(values) {
			this._pending = Object.assign(this._pending || {}, values);
			clearTimeout(this._t);
			this._t = setTimeout(() => {
				const send = this._pending; this._pending = null;
				const seq = (this._seq = (this._seq || 0) + 1);
				frappe.xcall("universal_theme_studio.api.set_user_preference", send).then((r) => {
					if (seq === this._seq) this.merge(r); // only the latest response may overwrite local state
				}).catch((e) => {
					this.merge(null, true);
					const msg = (e && e.message) || __("Could not save your preference");
					frappe.show_alert({ message: msg, indicator: "red" }, 6);
				});
			}, 250);
		},
		/* take the server's view (prefs, effective values, permissions) and re-apply it */
		merge(r, reload) {
			const go = (res) => {
				if (res) Object.assign(boot(), res);
				if (!this._previewing) { this.apply(this.theme, this.mode, false); }
				this.applyFonts();
				$(document).trigger("uts:prefs");
			};
			if (r || !reload) return go(r);
			frappe.xcall("universal_theme_studio.api.get_my_preferences").then(go).catch(() => {});
		},
		resetTheme() { return this._reset("theme"); },
		resetFonts() { return this._reset("fonts"); },
		resetAll() { return this._reset("all"); },
		_reset(scope) {
			clearTimeout(this._t); this._pending = null;
			return frappe.xcall("universal_theme_studio.api.reset_my_preferences", { scope }).then((r) => {
				this._previewing = false; this._prev = null;
				this._seq = (this._seq || 0) + 1;
				this.merge(r);
				return r;
			});
		},

		/* ---- fonts: four roles, applied through CSS variables (no rebuild, no reload) ---- */
		fontList() { return boot().font_list || []; },
		fontFamily(key) { return (this.fontList().find((f) => f.key === key) || {}).family || ""; },
		applyFonts() {
			const f = (boot().effective || {}).fonts || {};
			const set = (name, key) => {
				const fam = this.fontFamily(key);
				if (fam) root.style.setProperty(name, fam); else root.style.removeProperty(name);
			};
			set("--uts-font-override", f.interface);
			set("--uts-f-heading", f.heading);
			set("--uts-f-table", f.table);
			set("--uts-f-form", f.form);
		},
		/* key "" = back to the organization default for that role */
		setFont(role, key) {
			if (!this.canChooseFonts()) return;
			const b = boot();
			const org = (b.org && b.org.fonts) || {};
			b.prefs = Object.assign({}, b.prefs, { fonts: Object.assign({}, (b.prefs || {}).fonts, { [role]: key }) });
			b.effective = Object.assign({}, b.effective, { fonts: Object.assign({}, (b.effective || {}).fonts, { [role]: key || org[role] || "" }) });
			this.applyFonts();
			$(document).trigger("uts:prefs");
			this.save({ ["font_" + role]: key });
		},

		/* Re-inject site-wide settings (colors, fonts, backgrounds) */
		refresh() {
			let el = document.getElementById("uts-inline");
			if (!el) {
				el = document.createElement("style");
				el.id = "uts-inline";
				document.head.appendChild(el);
			}
			el.textContent = boot().css || "";
			root.setAttribute("data-uts-density", boot().density || "comfortable");
			root.toggleAttribute("data-uts-has-bg", /url\(/.test(boot().css || "") && /--uts-ws-image:url/.test(boot().css || ""));
			root.setAttribute("data-uts-wp", boot().wallpaper === 0 ? "off" : "on");
			root.setAttribute("data-uts-glass", boot().glass === 0 ? "off" : "on");
			this.apply(this.theme, this.mode);
			this.applyFonts();
			this.preload();
			if (window.$) $(document).trigger("uts:refresh");
		},

		/* Warm the cache for the other themes' default photos so switching is instant. */
		preload() {
			if (this._pre || boot().wallpaper === 0) return;
			this._pre = true;
			const size = window.innerWidth <= 1400 ? 1280 : 2560;
			const go = () => KEYS.forEach((k) => {
				if (k !== this.theme) new Image().src = `/assets/universal_theme_studio/wallpapers/${k}-${size}.jpg`;
			});
			(window.requestIdleCallback || ((f) => setTimeout(f, 1500)))(go);
		},
	};
	window.frappe = window.frappe || {};
	frappe.uts = uts;

	// older versions cached the choice in localStorage; preferences now live in the database only
	try { ["uts_theme", "uts_mode", "uts_wp"].forEach((k) => localStorage.removeItem(k)); } catch (e) { /* storage unavailable */ }

	uts.refresh();
	$(document).on("page-change", () => {
		if (uts._previewing && !/theme-gallery/.test(window.location.pathname)) uts.cancelPreview();
	});
	media.addEventListener("change", () => uts.mode === "auto" && uts.apply(uts.theme, "auto"));

	// Frappe's own theme switcher (user menu) changes data-theme / data-theme-mode.
	// Treat it as a mode change so it also survives reloads.
	new MutationObserver(() => {
		if (uts._own) return;
		const pref = root.getAttribute("data-theme-mode");
		const dt = root.getAttribute("data-theme");
		const mode = pref === "automatic" ? "auto" : (pref === "light" || pref === "dark") ? pref : (dt === "dark" ? "dark" : "light");
		if (mode !== uts.mode || uts.resolve(mode) !== root.getAttribute("data-uts-mode")) {
			uts._own = true;
			uts.apply(uts.theme, mode, true);
			uts._own = false;
		}
	}).observe(root, { attributes: true, attributeFilter: ["data-theme", "data-theme-mode"] });


	/* "Theme" in the user menu (bottom-left avatar menu / dock avatar), opening the themes-only dialog. Frappe builds that menu from a
	   plain options array, so we extend frappe.ui.Dropdown to add one item when - and only when - the array is
	   recognisably the user menu (it has both "settings" and "logout"). No DOM is touched; if anything differs
	   the menu is left exactly as Frappe built it. The same entry also ships through the supported
	   `standard_navbar_items` hook (header menu). */
	(function addUserMenuItem() {
		const Base = frappe.ui && frappe.ui.Dropdown;
		if (!Base || Base.__uts) return;
		class UtsDropdown extends Base {
			constructor(opts) {
				try {
					const groups = opts && opts.options;
					const names = (g) => ((g && g.options) || []).map((o) => o && o.name);
					if (Array.isArray(groups) && groups.some((g) => names(g).includes("settings")) && groups.some((g) => names(g).includes("logout"))) {
						const g0 = groups.find((g) => names(g).includes("settings"));
						if (!g0.options.some((o) => o.name === "theme-studio")) {
							const at = g0.options.findIndex((o) => o.name === "settings");
							g0.options.splice(at + 1, 0, {
								name: "theme-studio",
								label: uts.themeMenuLabel ? uts.themeMenuLabel() : __("Theme"),
								icon: "palette",
								condition: () => uts.canChooseTheme(),
								onclick: () => uts.openThemeDialog && uts.openThemeDialog(),
							});
						}
					}
				} catch (e) { /* leave the menu untouched */ }
				super(opts);
			}
		}
		UtsDropdown.__uts = true;
		frappe.ui.Dropdown = UtsDropdown;
	})();

	// Quick switcher in the v16 dock (falls back to the classic navbar)
	function addQuick() {
		if (document.getElementById("uts-quick")) return;
		if (!uts.canChooseTheme()) return;
		const $host = $(".dock-utilities").first().length ? $(".dock-utilities").first() : $(".navbar .navbar-nav").first();
		if (!$host.length) return;
		const sw = (uts.canChooseTheme() ? uts.availableThemes() : []).map((t) =>
			`<button class="uts-sw" data-key="${t.key}" title="${__(t.label)}" aria-label="${__(t.label)}" style="--sw:${t.p}"></button>`).join("");
		const $q = $(`<div id="uts-quick" class="uts-quick">
			<button class="btn-reset uts-quick-btn" aria-label="${__("Theme")}" title="${__("Theme")}" aria-haspopup="true" aria-expanded="false">
				<svg class="icon icon-md"><use href="#icon-color"></use></svg>
			</button>
			<div class="uts-quick-menu" hidden>
				<div class="uts-quick-title">${__("Theme")}</div>
				<div class="uts-swatches">${sw}</div>
				<button class="uts-mode">${__("Toggle light / dark")}</button>
				<button class="uts-open-dialog">${uts.themeMenuLabel ? uts.themeMenuLabel() : __("Theme")}</button>
			</div></div>`).appendTo($host);
		const $menu = $q.find(".uts-quick-menu"), $btn = $q.find(".uts-quick-btn");
		const close = () => { $menu.prop("hidden", true); $btn.attr("aria-expanded", "false"); };
		$btn.on("click", (e) => { e.stopPropagation(); const open = $menu.prop("hidden"); $menu.prop("hidden", !open); $btn.attr("aria-expanded", String(open)); });
		$q.on("click", ".uts-sw", function () { uts.setTheme($(this).data("key")); });
		$q.on("click", ".uts-mode", () => uts.toggleMode());
		$q.on("click", ".uts-open-dialog", () => { close(); uts.openThemeDialog && uts.openThemeDialog(); });
		$(document).on("click.uts keydown.uts", (e) => { if (e.type === "click" || e.key === "Escape") close(); });
	}
	$(document).on("toolbar_setup page-change", () => setTimeout(addQuick, 50));
	$(function () { setTimeout(addQuick, 400); setTimeout(addQuick, 1500); });
})();
