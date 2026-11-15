/* Universal Theme Studio - theme picker UI shared by the "Theme" dialog (every user) and the admin Theme Studio page.
   Only frappe.uts calls are made here (which go to the validated, own-preferences-only API). */
(function () {
	if (!window.frappe || !frappe.uts) return;
	const uts = frappe.uts;
	const esc = (s) => frappe.utils.escape_html(s);
	const isAR = () => String(frappe.boot.lang || document.documentElement.lang || "").toLowerCase().startsWith("ar");
	const themeLabel = () => (isAR() ? "الثيم" : __("Theme"));

	const chips = (t) => {
		const cols = [t.p, t.c2 || t.a, t.a, t.s];
		const grad = t.g ? `linear-gradient(90deg, ${t.g.join(", ")})` : `linear-gradient(90deg, ${t.p}, ${t.a})`;
		return `<div class="uts-palette" aria-hidden="true">${cols.map((c) => `<i style="background:${c}"></i>`).join("")}<b style="background:${grad}"></b></div>`;
	};

	/* Render the theme cards into $host and keep them in sync.
	   opts: mode (light/dark/auto switch), wallpaper (preset picker), settingsLink (admins only) */
	function mountThemes($host, opts) {
		const o = Object.assign({ mode: false, wallpaper: false, settingsLink: false }, opts || {});
		const alive = () => document.body.contains($host[0]);

		const html = () => {
			const cur = uts.theme, mode = uts.mode, prev = uts.previewing;
			const canTheme = uts.canChooseTheme(), canWp = uts.canChooseWallpaper();
			const orgTheme = (uts.orgDefaults || {}).theme;
			const shown = prev || cur;
			const th = uts.themes.find((x) => x.key === shown) || {};
			const modes = [["light", __("Light")], ["dark", __("Dark")], ["auto", __("Automatic")]];
			const wp = uts.wallpaper;
			const card = (t) => {
				const active = t.key === cur && !prev, previewing = t.key === prev;
				return `
				<div class="uts-card ${active ? "active" : ""} ${previewing ? "previewing" : ""}" data-key="${t.key}">
					<button type="button" class="uts-prev-hit" data-act="apply" ${canTheme ? "" : "disabled"} aria-label="${esc(__("Apply {0}", [__(t.label)]))}" aria-pressed="${active}">
						<div class="uts-prev" data-uts-theme="${t.key}" data-uts-mode="${uts.resolve(mode)}">
							<div class="uts-prev-nav"><i></i><i></i><i></i></div>
							<div class="uts-prev-side"><b></b><i></i><i></i></div>
							<div class="uts-prev-main"><div class="uts-prev-card"><u></u><s></s></div><div class="uts-prev-btn"></div></div>
						</div>
					</button>
					<div class="uts-card-meta"><strong>${esc(__(t.label))}</strong><span>${esc(__(t.hint))}</span></div>
					${chips(t)}
					<div class="uts-card-actions">
						<button type="button" class="btn btn-default btn-xs" data-act="preview" ${active || !canTheme ? "disabled" : ""}>${__("Preview")}</button>
						<button type="button" class="btn btn-primary btn-xs" data-act="apply" ${active || !canTheme ? "disabled" : ""}>${active ? __("Applied") : __("Apply")}</button>
					</div>
					<span class="uts-check">${previewing ? __("Previewing") : __("Active")}</span>
					${t.key === orgTheme ? `<span class="uts-default-tag">${__("Organization default")}</span>` : ""}
				</div>`;
			};
			return `
				${!canTheme ? `<div class="uts-notice" role="status">${__("Your administrator has set the theme for everyone. Theme selection is disabled.")}</div>` : ""}
				${prev ? `<div class="uts-preview-bar" role="status">
					<span>${__("Previewing")} <b>${esc(__(th.label || prev))}</b> — ${__("not saved yet")}</span>
					<span><button type="button" class="btn btn-primary btn-xs" data-act="commit">${__("Apply")}</button>
					<button type="button" class="btn btn-default btn-xs" data-act="cancel">${__("Cancel")}</button></span>
				</div>` : ""}
				<div class="uts-gallery-bar">
					${o.mode ? `<div class="uts-seg" role="group" aria-label="${__("Mode")}">${modes.map(([k, l]) => `<button data-mode="${k}" class="${mode === k ? "active" : ""}">${l}</button>`).join("")}</div>` : "<span></span>"}
					<span class="uts-bar-actions">
						<button type="button" class="btn btn-default btn-sm" data-act="reset-theme" ${canTheme ? "" : "disabled"} title="${esc(__("Back to the organization's theme, mode and wallpaper."))}">${__("Reset to Default")}</button>
						${o.settingsLink ? `<a class="btn btn-default btn-sm" href="/desk/theme-settings">${__("Theme Settings")}</a>` : ""}
					</span>
				</div>
				<div class="uts-gallery-grid">${uts.availableThemes().map(card).join("")}</div>
				${o.wallpaper ? `
				<h3 class="uts-gallery-h">${__("Wallpaper")}</h3>
				<p class="text-muted uts-gallery-sub">${canWp ? __("Optional abstract wallpapers for the desktop. They replace the theme photo until you pick Theme default.") : __("Your administrator has disabled wallpaper choice.")}</p>
				<div class="uts-wp-grid" role="radiogroup" aria-label="${__("Wallpaper")}">
					<button type="button" role="radio" aria-checked="${wp === "theme"}" class="uts-wp ${wp === "theme" ? "active" : ""}" data-wp="theme" ${canWp ? "" : "disabled"}>
						<span class="uts-wp-sw uts-wp-theme" style="background:linear-gradient(135deg, ${th.p || "#888"}, ${th.a || "#444"})"></span>
						<span>${__("Theme default")}</span>
					</button>
					${uts.presets.map((p) => `
					<button type="button" role="radio" aria-checked="${wp === p.key}" class="uts-wp ${wp === p.key ? "active" : ""}" data-wp="${p.key}" ${canWp ? "" : "disabled"}>
						<span class="uts-wp-sw" style="background:radial-gradient(circle at 20% 25%, ${p.g[1]}, transparent 60%), radial-gradient(circle at 85% 70%, ${p.g[2]}, transparent 60%), ${p.g[0]}"></span>
						<span>${esc(__(p.label))}</span>
					</button>`).join("")}
				</div>` : ""}`;
		};

		const render = () => $host.html(html());
		render();

		$host.off(".utsui")
			.on("click.utsui", "[data-act]", function (e) {
				const act = $(this).data("act"), key = $(this).closest(".uts-card").data("key");
				e.stopPropagation();
				if (act === "apply") uts.setTheme(key);
				else if (act === "preview") { uts.preview(key); render(); }
				else if (act === "commit") uts.commitPreview();
				else if (act === "cancel") { uts.cancelPreview(); render(); }
				else if (act === "reset-theme") {
					frappe.confirm(__("Reset the theme to the organization default?"), () => uts.resetTheme().then(render));
				}
			})
			.on("click.utsui", ".uts-seg button", function () { uts.setMode($(this).data("mode")); })
			.on("click.utsui", ".uts-wp:not([disabled])", function () { uts.setWallpaper($(this).data("wp")); });

		// re-render when the theme/prefs change elsewhere; unbind itself once the host is gone
		const ns = ".utsui" + Math.random().toString(36).slice(2, 8);
		$(document).on("uts:change" + ns + " uts:prefs" + ns, () => {
			if (!alive()) return $(document).off(ns);
			render();
		});
		return { render, destroy: () => $(document).off(ns) };
	}


	/* ---------------- Fonts (four roles, live Arabic previews) ---------------- */
	const flabel = (k) => (uts.fontList().find((f) => f.key === k) || {}).label || "";
	// family strings contain double quotes ("UTS Tajawal"), which would end an inline style attribute: use single quotes
	const fam = (k) => String(uts.fontFamily(k) || "").replace(/"/g, "'");
	const ROLES = () => [
		["interface", __("Interface & navigation"), __("Menus, sidebar, buttons and general text")],
		["heading", __("Headings & dashboard cards"), __("Page titles, workspace cards and shortcuts")],
		["table", __("Tables & data"), __("List views, reports and child tables")],
		["form", __("Forms & input fields"), __("Field labels, inputs and filters")],
	];
	const sampleAR = "أبجد هوز حطي كلمن سعفص قرشت ثخذ ضظغ ١٢٣٤٥٦٧٨٩٠";
	const previewFor = (role, f) => {
		const st = f ? `style="font-family:${f}"` : "";
		const rtl = isAR() ? "rtl" : "ltr";
		if (role === "interface") return `<div class="uts-fm-prev" ${st} dir="${rtl}"><span class="uts-fm-chip active">لوحة التحكم</span><span class="uts-fm-chip">المبيعات</span><span class="uts-fm-chip">المخزون</span><span class="uts-fm-chip">التقارير</span><div class="uts-fm-en">Dashboard · Sales · Stock · Reports</div></div>`;
		if (role === "heading") return `<div class="uts-fm-prev uts-fm-card" ${st} dir="${rtl}"><h4>ملخص المبيعات الشهرية</h4><div class="uts-fm-num">١٢٬٤٥٠٫٠٠ ر.س</div><div class="uts-fm-en">Monthly sales summary · 12,450.00</div></div>`;
		if (role === "table") return `<div class="uts-fm-prev" ${st} dir="${rtl}"><table class="uts-fm-table"><thead><tr><th>رقم الفاتورة</th><th>العميل</th><th>المبلغ</th></tr></thead><tbody><tr><td>SINV-0001</td><td>شركة النور للتجارة</td><td>1,250.00</td></tr><tr><td>SINV-0002</td><td>مؤسسة الأفق</td><td>8,740.50</td></tr></tbody></table></div>`;
		return `<div class="uts-fm-prev uts-fm-form" ${st} dir="${rtl}"><label>اسم العميل <small>Customer name</small></label><input type="text" class="uts-fm-input" placeholder="اكتب اسم العميل هنا" value="محمد عبد الله" readonly tabindex="-1"></div>`;
	};

	function mountFonts($host) {
		const alive = () => document.body.contains($host[0]);
		const html = () => {
			const can = uts.canChooseFonts();
			const eff = uts.eff.fonts || {}, pref = ((frappe.boot.uts.prefs || {}).fonts) || {}, org = (uts.orgDefaults.fonts) || {};
			const list = uts.fontList();
			const rows = ROLES().map(([role, title, hint]) => {
				const orgLabel = flabel(org[role] || (role === "interface" ? "" : org.interface)) || __("Theme font");
				return `<div class="uts-fm-row" data-role="${role}">
					<div class="uts-fm-head"><div><strong>${title}</strong><span>${hint}</span></div>
						<select class="form-control uts-fm-select" data-role="${role}" ${can ? "" : "disabled"} aria-label="${esc(title)}">
							<option value="">${esc(__("Organization default"))} (${esc(orgLabel)})</option>
							${list.map((f) => `<option value="${f.key}" ${pref[role] === f.key ? "selected" : ""}>${esc(f.label)}</option>`).join("")}
						</select></div>
					${previewFor(role, fam(eff[role] || eff.interface))}
				</div>`;
			}).join("");
			const specimens = list.filter((f) => f.key !== "system").map((f) => `
				<div class="uts-spec ${eff.interface === f.key ? "active" : ""}" style="font-family:${String(f.family).replace(/"/g, "'")}">
					<strong>${esc(f.label)}</strong><span dir="rtl">${sampleAR}</span><span dir="ltr" class="uts-spec-en">The quick brown fox 0123456789</span>
				</div>`).join("");
			return `
				${!can ? `<div class="uts-notice" role="status">${__("Your administrator has disabled font customization. The organization fonts are used.")}</div>` : ""}
				<div class="uts-gallery-bar"><span class="text-muted">${__("Changes apply instantly and are saved to your account.")}</span>
					<span class="uts-bar-actions"><button type="button" class="btn btn-default btn-sm" data-act="reset-fonts" ${can ? "" : "disabled"}>${__("Reset fonts to default")}</button></span></div>
				<div class="uts-fm-grid">${rows}</div>
				<h3 class="uts-gallery-h">${__("Available fonts")}</h3>
				<div class="uts-spec-grid">${specimens}</div>`;
		};
		const render = () => $host.html(html());
		render();
		$host.off(".utsfm")
			.on("click.utsfm", "[data-act='reset-fonts']", (e) => {
				e.stopPropagation();
				frappe.confirm(__("Reset all four fonts to the organization defaults?"), () => uts.resetFonts().then(render));
			})
			.on("change.utsfm", ".uts-fm-select", function () { uts.setFont($(this).data("role"), $(this).val()); });
		const ns = ".utsfm" + Math.random().toString(36).slice(2, 8);
		$(document).on("uts:prefs" + ns, () => {
			if (!alive()) return $(document).off(ns);
			// leave the open <select> alone while its own change is being applied
			if (document.activeElement && document.activeElement.classList.contains("uts-fm-select")) return;
			render();
		});
		return { render, destroy: () => $(document).off(ns) };
	}

	/* Themes | Fonts tabs. admin = full Studio (mode switch, wallpaper presets, settings link); users get themes + fonts only.
	   The Fonts tab only exists when the administrator allows font customization. */
	function mountPicker($host, opts) {
		const o = Object.assign({ admin: false }, opts || {});
		let tab = "themes", inner = null;
		const render = () => {
			if (inner) inner.destroy();
			const showFonts = uts.canChooseFonts();
			if (!showFonts) tab = "themes";
			const tabs = [["themes", isAR() ? "الثيمات" : __("Themes")]].concat(showFonts ? [["fonts", isAR() ? "الخطوط" : __("Fonts")]] : [])
				.concat(o.admin && uts.ui.mountPrint ? [["print", isAR() ? "نماذج الطباعة" : __("Print Formats")]] : []);
			$host.html(`${tabs.length > 1 ? `<div class="uts-tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${tab === k}" class="${tab === k ? "active" : ""}" data-tab="${k}">${l}</button>`).join("")}</div>` : ""}
				<div class="uts-tab-body"></div>`);
			const $b = $host.find(".uts-tab-body");
			inner = tab === "themes"
				? mountThemes($b, { mode: o.admin, wallpaper: o.admin, settingsLink: o.admin })
				: tab === "print" ? uts.ui.mountPrint($b) : mountFonts($b);
		};
		render();
		$host.off(".utspick").on("click.utspick", "[data-tab]", function () { tab = $(this).data("tab"); render(); });
		return { render, destroy: () => { if (inner) inner.destroy(); } };
	}

	/* The user-facing "Theme" dialog: Themes + Fonts tabs (no Studio), styled like Frappe's "Toggle Appearance" dialog */
	function openThemeDialog() {
		if (uts._themeDialog && uts._themeDialog.display) return uts._themeDialog.show();
		const d = new frappe.ui.Dialog({
			title: uts.canChooseFonts() ? (isAR() ? "الثيم والخطوط" : __("Theme & Fonts")) : themeLabel(),
			size: "extra-large",
			fields: [{ fieldtype: "HTML", fieldname: "body" }],
			on_hide: () => { uts.cancelPreview(); if (d._m) d._m.destroy(); uts._themeDialog = null; },
		});
		d.$wrapper.addClass("uts-theme-dialog");
		d._m = mountPicker($(d.fields_dict.body.wrapper), { admin: false });
		uts._themeDialog = d;
		d.show();
	}

	uts.ui = { mountThemes, mountFonts, mountPicker, chips };
	uts.openThemeDialog = openThemeDialog;
	uts.themeMenuLabel = themeLabel;

	/* "Theme" in the desktop launcher's avatar menu, next to "Toggle Theme". Uses Frappe's own
	   add_menu_item() contract (the same one the billing bundle uses); order 25 = right after Toggle Theme. */
	$(document).on("desktop_screen", (e, data) => {
		try {
			data.desktop.add_menu_item({
				label: themeLabel(), // already translated: menu_row() passes it through __() unchanged
				icon: "palette",
				order: 25,
				condition: () => uts.canChooseTheme(),
				onclick: openThemeDialog,
			});
		} catch (err) { /* menu stays as Frappe built it */ }
	});
})();
