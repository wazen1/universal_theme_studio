/* Universal Theme Studio - login designs (six), runtime.
   Adds a visual panel next to Frappe's native login card and styles the card; it never touches the forms,
   handlers, CSRF, MFA, password reset, email-link or social-login flows (Frappe's login.js keeps running unchanged).
   - Config comes from window.__uts_login (written by the server from Theme Settings; organization-level, public data only).
   - Any error removes our additions and leaves the native page usable. ?native=1 skips everything.
   - The Theme Settings live preview loads /login?uts_preview=1 in an iframe and posts a config over postMessage
     (same-origin only); the page is then inert (no form submission). */
(function () {
	const html = document.documentElement;
	const base = window.__uts_login;
	if (!base || /[?&]native=1(&|$)/.test(location.search)) return;
	if (!document.body || document.body.getAttribute("data-path") !== "login") return;

	const SIX = ["fiori-blue", "redwood-purple", "emerald-modern", "midnight-pro", "sandstone-premium", "ocean-breeze", "sunset-fusion", "forest-harmony", "royal-indigo", "modern-teal", "carbon-pro"];
	const preview = /[?&]uts_preview=1(&|$)/.test(location.search) && window.parent !== window;
	const origLayout = html.getAttribute("data-uts-login-layout") || "center";
	const svg = (d) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
	const ICONS = {
		shield: svg('<path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/>'),
		bolt: svg('<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>'),
		chart: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
		users: svg('<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 5.2a3 3 0 010 5.6M18 14.8c2 .6 3.5 2.4 3.5 5.2"/>'),
		globe: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"/>'),
		lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>'),
		clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
		layers: svg('<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>'),
	};
	let cfg = JSON.parse(JSON.stringify(base));
	const lang = () => (html.lang || "en").toLowerCase().startsWith("ar") ? "ar" : "en";
	const pick = (obj, key) => (obj && ((obj[lang()] || {})[key] || (obj[lang() === "ar" ? "en" : "ar"] || {})[key])) || "";

	function setLang(l) {
		try {
			document.cookie = `preferred_language=${l}; path=/; max-age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
			const u = new URL(location.href);
			u.searchParams.set("_lang", l);
			location.replace(u.toString());
		} catch (e) { /* ignore */ }
	}

	function buildPanel() {
		let el = document.getElementById("uts-lv");
		if (!el) {
			el = document.createElement("div");
			el.id = "uts-lv";
			el.setAttribute("role", "complementary");
			el.innerHTML = `
				<div class="lv-top"><img class="lv-logo" alt=""></div>
				<div class="lv-body"><h1 class="lv-title"></h1><p class="lv-sub"></p></div>
				<ul class="lv-features"></ul>
				<div class="lv-shapes" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
				<div id="uts-lang" role="group"></div>`;
			document.body.prepend(el);
		}
		return el;
	}

	function render() {
		const six = SIX.includes(cfg.design);
		// palette: the design's own theme tokens (login only - nobody's saved preferences are involved)
		if (cfg.design === "native") {
			["data-uts-theme", "data-uts-mode", "data-uts-login-design"].forEach((a) => html.removeAttribute(a));
			const old = document.getElementById("uts-lv"); if (old) old.remove();
			return;
		}
		if (cfg.theme) html.setAttribute("data-uts-theme", cfg.theme);
		if (six) {
			html.setAttribute("data-uts-mode", "light");
			html.setAttribute("data-theme", "light");
			html.setAttribute("data-uts-login-design", cfg.design);
			html.setAttribute("data-uts-login-layout", "design");
		} else {
			html.removeAttribute("data-uts-login-design");
			html.setAttribute("data-uts-login-layout", origLayout);
			const old = document.getElementById("uts-lv"); if (old) old.remove();
			return;
		}
		html.setAttribute("data-uts-login-pos", cfg.position || "design");
		html.setAttribute("data-uts-lv-features", cfg.showFeatures ? "1" : "0");
		const set = (n, v) => (v === "" || v == null) ? html.style.removeProperty(n) : html.style.setProperty(n, v);
		set("--uts-lg-radius", cfg.radius ? `${cfg.radius}px` : "");
		set("--uts-lg-k", cfg.glass !== 50 ? String(Math.min(Math.max(cfg.glass, 0), 100) / 50) : "");
		set("--uts-login-overlay", cfg.overlay != null ? String(cfg.overlay) : "");
		set("--uts-lg-image-set", cfg.image ? `url("${String(cfg.image).replace(/"/g, "%22")}")` : "");
		set("--uts-login-card", cfg.cardColor || "");
		set("--uts-login-btn", cfg.buttonColor || "");

		const el = buildPanel();
		const native = document.querySelector(".page-card .app-logo, .app-logo");
		const logo = cfg.logo || (native && native.getAttribute("src")) || "";
		const img = el.querySelector(".lv-logo");
		if (logo) { img.src = logo; img.hidden = false; } else img.hidden = true;
		el.querySelector(".lv-title").textContent = pick(cfg.texts, "title");
		el.querySelector(".lv-sub").textContent = pick(cfg.texts, "subtitle");
		const ul = el.querySelector(".lv-features");
		ul.textContent = "";
		(cfg.features || []).slice(0, 3).forEach((f) => {
			const li = document.createElement("li");
			li.innerHTML = `<span class="lv-ic">${ICONS[f.icon] || ICONS.shield}</span><div><b></b><span></span></div>`;
			li.querySelector("b").textContent = pick(f, "title");
			li.querySelector("div > span").textContent = pick(f, "text");
			ul.appendChild(li);
		});
		const lg = el.querySelector("#uts-lang");
		lg.textContent = "";
		if ((cfg.langs || []).length > 1) {
			const names = { en: "English", ar: "العربية" };
			cfg.langs.forEach((l) => {
				const b = document.createElement("button");
				b.type = "button"; b.textContent = names[l] || l; b.lang = l;
				b.setAttribute("aria-pressed", String(lang() === l));
				if (lang() === l) b.classList.add("active");
				b.addEventListener("click", () => lang() !== l && setLang(l));
				lg.appendChild(b);
			});
		}
		if (preview) html.setAttribute("data-uts-preview", "1");
	}


	/* Mixed Arabic/English: a Latin-only string left untranslated inside an RTL page would put its trailing
	   punctuation on the wrong side ("?Forgot password"). Give such strings their own LTR direction. */
	function fixMixed() {
		if (!html.dir || html.dir.toLowerCase() !== "rtl") return;
		document.querySelectorAll("section[class^='for-'] .page-card h4, section[class^='for-'] .page-card p, section[class^='for-'] .page-card a, section[class^='for-'] .page-card label, section[class^='for-'] .page-card .es-alert__title").forEach((el) => {
			if (el.children.length > 0 && el.tagName !== "P") return;
			const txt = (el.textContent || "").trim();
			if (!txt || /[\u0600-\u06FF]/.test(txt) || !/[A-Za-z]/.test(txt)) return;
			el.setAttribute("dir", "ltr");
			if (getComputedStyle(el).display !== "inline") el.style.textAlign = "end";
		});
	}

	function cleanup() {
		const el = document.getElementById("uts-lv"); if (el) el.remove();
		html.removeAttribute("data-uts-login-design");
		html.setAttribute("data-uts-login-layout", origLayout);
	}

	try {
		render();
		fixMixed();
		if (preview) {
			// the preview page is inert: it can never submit credentials
			document.addEventListener("submit", (e) => { e.preventDefault(); e.stopPropagation(); }, true);
			window.addEventListener("message", (ev) => {
				if (ev.origin !== location.origin) return;
				const m = ev.data;
				if (m && m.type === "uts-login-preview" && m.cfg && typeof m.cfg === "object") {
					try { cfg = Object.assign({}, cfg, m.cfg); render(); } catch (e) { cleanup(); }
				}
			});
			window.parent.postMessage({ type: "uts-login-ready" }, location.origin);
		}
	} catch (e) {
		cleanup(); // safe fallback: native login stays fully usable
	}
})();
