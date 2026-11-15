/* Universal Theme Studio - /desk welcome header + smart clock.

   - One hero node (#uts-hero) is inserted between Frappe's .desktop-navbar and .desktop-container
     while the launcher (#page-desktop) is visible, and removed otherwise. Frappe's own nodes are
     never moved or edited.
   - Exactly one timer chain exists (see Clock.loop): it aligns itself to the second boundary, is
     cancelled whenever the hero is removed, and cannot be duplicated (a sequence token guards it).
   - All five clock designs live in the same markup; CSS (welcome.css) shows the one that belongs
     to the active theme, so switching themes needs no JS and no re-render.
   - Time zone: the user's configured zone (frappe.boot.time_zone.user), then the system zone,
     then the browser's.
   - Hijri: Umm al-Qura via Intl (islamic-umalqura). Fallback chain when the browser lacks it:
     islamic (astronomical) -> islamic-civil (tabular, may differ by +/-1 day) -> Hijri hidden.
     The calendar actually used is exposed as data-hijri-calendar on #uts-hero. */
(function () {
	if (!window.frappe || !frappe.uts) return;
	const uts = frappe.uts;
	const boot = () => (frappe.boot && frappe.boot.uts) || {};
	const isAR = () => String(frappe.boot.lang || document.documentElement.lang || "").toLowerCase().startsWith("ar");

	const T = {
		morning: { ar: "صباح الخير", en: "Good morning" },
		evening: { ar: "مساء الخير", en: "Good evening" },
		am: { ar: "ص", en: "AM" },
		pm: { ar: "م", en: "PM" },
		greg: { ar: "ميلادي", en: "Gregorian" },
		hijri: { ar: "هجري", en: "Hijri" },
	};
	const tr = (k) => T[k][isAR() ? "ar" : "en"];

	const SUN = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.9 1.9M16.8 16.8l1.9 1.9M18.7 5.3l-1.9 1.9M7.2 16.8l-1.9 1.9"/></svg>';
	const MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z"/><path d="M17 4.5v2M16 5.5h2" /></svg>';

	/* ---------- time helpers ---------- */
	const validTZ = (z) => { try { new Intl.DateTimeFormat("en", { timeZone: z }); return true; } catch (e) { return false; } };
	function timeZone() {
		const t = frappe.boot.time_zone || {};
		return [t.user, t.system].find((z) => z && validTZ(z)) || Intl.DateTimeFormat().resolvedOptions().timeZone;
	}

	const Clock = {
		offset: 0, // test aid only (see setTime)
		_seq: 0,
		_timer: null,
		_fmt: null,
		_tz: null,
		now() { return new Date(Date.now() + this.offset); },
		/* Debug/test helper: frappe.uts.clock.setTime(new Date("2026-11-12T11:59:55")) shifts the displayed
		   time without touching the system clock; setTime(null) restores real time. */
		setTime(d) { this.offset = d ? new Date(d).getTime() - Date.now() : 0; this.tick(true); },

		parts() {
			const tz = timeZone();
			if (!this._fmt || this._tz !== tz) {
				this._tz = tz;
				this._fmt = new Intl.DateTimeFormat("en-US", {
					timeZone: tz, hourCycle: "h23", hour: "numeric", minute: "numeric", second: "numeric",
				});
			}
			const o = {};
			this._fmt.formatToParts(this.now()).forEach((p) => { if (p.type !== "literal") o[p.type] = parseInt(p.value, 10); });
			if (o.hour === 24) o.hour = 0;
			return o;
		},

		/* locale-aware date strings, rebuilt only when the day changes */
		dates() {
			const tz = timeZone(), d = this.now(), ar = isAR();
			const base = ar ? "ar" : "en";
			const wk = new Intl.DateTimeFormat(`${base}-u-nu-latn`, { timeZone: tz, weekday: "long" }).format(d);
			const gr = new Intl.DateTimeFormat(`${base}-u-ca-gregory-nu-latn`, {
				timeZone: tz, calendar: "gregory", day: "numeric", month: "long", year: "numeric",
			}).format(d);
			let hijri = "", used = "";
			for (const cal of ["islamic-umalqura", "islamic", "islamic-civil"]) {
				try {
					const f = new Intl.DateTimeFormat(`${ar ? "ar-SA" : "en"}-u-ca-${cal}-nu-latn`, {
						timeZone: tz, calendar: cal, day: "numeric", month: "long", year: "numeric", era: "short",
					});
					if (f.resolvedOptions().calendar === cal) { hijri = f.format(d); used = cal; break; }
				} catch (e) { /* try next */ }
			}
			return { wk, gr, hijri, used };
		},

		/* ---------- DOM ---------- */
		els: null,
		build(hero) {
			const ticks = Array.from({ length: 60 }, (_, i) => {
				const major = i % 5 === 0, a = (i * 6 * Math.PI) / 180;
				const r1 = major ? 80 : 84, r2 = 90;
				return `<line class="${major ? "t-major" : "t-minor"}" x1="${100 + r1 * Math.sin(a)}" y1="${100 - r1 * Math.cos(a)}" x2="${100 + r2 * Math.sin(a)}" y2="${100 - r2 * Math.cos(a)}"/>`;
			}).join("");
			const roman = ["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"].map((n, i) => {
				const a = (i * 30 * Math.PI) / 180;
				return `<text class="n-roman" x="${100 + 68 * Math.sin(a)}" y="${100 - 68 * Math.cos(a)}">${n}</text>`;
			}).join("");
			hero.innerHTML = `
			<div class="uts-welcome" role="group">
				<span class="uts-avatar"></span>
				<div class="uts-greet">
					<span class="uts-daynight"></span>
					<h1 class="uts-greet-text"></h1>
				</div>
			</div>
			<div class="uts-clock-card" role="group">
				<div class="uts-clock" role="timer" aria-live="off">
					<div class="uts-analog">
						<svg viewBox="0 0 200 200" aria-hidden="true">
							<defs>
								<linearGradient id="uts-g-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset="1" stop-color="#4aa3f0" stop-opacity=".16"/></linearGradient>
								<linearGradient id="uts-g-ocean" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset=".6" stop-color="#06b6d4" stop-opacity=".2"/><stop offset="1" stop-color="#1d4ed8" stop-opacity=".3"/></linearGradient>
								<linearGradient id="uts-g-forest" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b6e07a"/><stop offset=".5" stop-color="#2f8a4b"/><stop offset="1" stop-color="#0f3d1f"/></linearGradient>
								<linearGradient id="uts-g-copper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1c58f"/><stop offset=".5" stop-color="#b8743a"/><stop offset="1" stop-color="#7a4520"/></linearGradient>
							</defs>
							<circle class="a-bezel" cx="100" cy="100" r="97"/>
							<circle class="a-face" cx="100" cy="100" r="90"/>
							<path class="a-shine" d="M30 78a76 76 0 0 1 140 0c-34-16-106-16-140 0Z"/>
							<g class="a-ticks">${ticks}</g>
							<g class="a-nums">${roman}</g>
							<line class="a-hand a-hour" x1="100" y1="106" x2="100" y2="58"/>
							<line class="a-hand a-min" x1="100" y1="110" x2="100" y2="36"/>
							<line class="a-hand a-sec" x1="100" y1="116" x2="100" y2="26"/>
							<circle class="a-pin" cx="100" cy="100" r="4.5"/>
						</svg>
					</div>
					<div class="uts-rings">
						<svg viewBox="0 0 200 200" aria-hidden="true">
							<circle class="r-track" cx="100" cy="100" r="92"/><circle class="r-arc r-s" cx="100" cy="100" r="92" pathLength="100"/>
							<circle class="r-track" cx="100" cy="100" r="78"/><circle class="r-arc r-m" cx="100" cy="100" r="78" pathLength="100"/>
							<circle class="r-track" cx="100" cy="100" r="64"/><circle class="r-arc r-h" cx="100" cy="100" r="64" pathLength="100"/>
						</svg>
					</div>
					<div class="uts-digital" dir="ltr">
						<span class="d-h"></span><span class="d-c">:</span><span class="d-m"></span><span class="d-c d-c2">:</span><span class="d-s"></span><span class="d-ap"></span>
					</div>
					<div class="uts-secbar" aria-hidden="true"><i></i></div>
				</div>
				<div class="uts-dates">
					<div class="uts-weekday"></div>
					<div class="uts-date uts-greg"><b>${tr("greg")}</b><span></span></div>
					<div class="uts-date uts-hijri"><b>${tr("hijri")}</b><span></span></div>
				</div>
			</div>`;
			const q = (s) => hero.querySelector(s);
			this.els = {
				avatar: q(".uts-avatar"), icon: q(".uts-daynight"), greet: q(".uts-greet-text"),
				hour: q(".a-hour"), min: q(".a-min"), sec: q(".a-sec"),
				rs: q(".r-s"), rm: q(".r-m"), rh: q(".r-h"),
				dh: q(".d-h"), dm: q(".d-m"), ds: q(".d-s"), dap: q(".d-ap"),
				bar: q(".uts-secbar i"), clock: q(".uts-clock"),
				wk: q(".uts-weekday"), greg: q(".uts-greg span"), hijri: q(".uts-hijri span"), hijriRow: q(".uts-hijri"),
				gregLabel: q(".uts-greg b"), hijriLabel: q(".uts-hijri b"),
			};
			this._last = {};
			this.paintAvatar();
			this.syncFlags(hero);
		},

		paintAvatar() {
			try { this.els.avatar.innerHTML = frappe.avatar(frappe.session.user, "avatar-large"); } catch (e) { /* optional */ }
		},

		firstName() {
			const u = (frappe.boot.user || {});
			const full = (frappe.user_info(frappe.session.user) || {}).fullname || frappe.session.user_fullname || "";
			return (u.first_name || full.split(" ")[0] || "").trim();
		},

		tick(force) {
			const hero = document.getElementById("uts-hero");
			if (!hero || !this.els) return;
			const p = this.parts(), L = this._last, E = this.els;
			const h = p.hour, m = p.minute, s = p.second;
			const is24 = !!boot().clock24;

			// greeting: morning strictly before 12:00, evening from 12:00 (user's time zone)
			const period = h < 12 ? "morning" : "evening";
			const daytime = h >= 6 && h < 18;
			const name = this.firstName();
			const key = `${period}|${name}|${isAR()}`;
			if (force || L.key !== key) {
				L.key = key;
				E.greet.textContent = `${tr(period)}${isAR() ? "،" : ","} ${name}`;
				hero.dataset.period = period;
			}
			if (force || L.dn !== daytime) {
				L.dn = daytime;
				E.icon.innerHTML = daytime ? SUN : MOON;
				E.icon.dataset.kind = daytime ? "sun" : "moon";
			}

			// analog + rings + bar
			E.hour.setAttribute("transform", `rotate(${(h % 12) * 30 + m * 0.5} 100 100)`);
			E.min.setAttribute("transform", `rotate(${m * 6 + s * 0.1} 100 100)`);
			E.sec.setAttribute("transform", `rotate(${s * 6} 100 100)`);
			E.rs.style.strokeDashoffset = 100 - (s / 60) * 100 || 0;
			E.rm.style.strokeDashoffset = 100 - ((m + s / 60) / 60) * 100;
			E.rh.style.strokeDashoffset = 100 - (((h % 12) + m / 60) / 12) * 100;
			E.bar.style.width = `${(s / 60) * 100}%`;

			// digital readout
			const dh = is24 ? h : ((h + 11) % 12) + 1;
			const pad = (n) => String(n).padStart(2, "0");
			E.dh.textContent = pad(dh);
			E.dm.textContent = pad(m);
			E.ds.textContent = pad(s);
			E.dap.textContent = is24 ? "" : h < 12 ? tr("am") : tr("pm");
			const label = `${pad(dh)}:${pad(m)}:${pad(s)} ${E.dap.textContent}`.trim();
			if (s % 15 === 0 || force) E.clock.setAttribute("aria-label", label);

			// dates change at most once a day (re-checked each tick by their own key)
			const dk = `${p.second === 0 || force || !L.dates ? "r" : "k"}`;
			if (dk === "r" || !L.dates) {
				const d = this.dates();
				const sig = `${d.wk}|${d.gr}|${d.hijri}|${isAR()}`;
				if (sig !== L.dates) {
					L.dates = sig;
					E.wk.textContent = d.wk;
					E.greg.textContent = d.gr;
					E.hijri.textContent = d.hijri;
					E.hijriRow.hidden = !d.hijri;
					E.gregLabel.textContent = tr("greg");
					E.hijriLabel.textContent = tr("hijri");
					hero.dataset.hijriCalendar = d.used || "none";
				}
			}
		},

		/* single self-aligning timer chain */
		loop(seq) {
			if (seq !== this._seq) return;
			this.tick();
			this._timer = setTimeout(() => this.loop(seq), 1000 - (Date.now() % 1000) + 8);
		},
		start() { this.stop(); this._seq += 1; this.loop(this._seq); },
		stop() { this._seq += 1; clearTimeout(this._timer); this._timer = null; },

		syncFlags(hero) {
			hero = hero || document.getElementById("uts-hero");
			if (!hero) return;
			const b = boot();
			const w = b.welcome !== 0, c = b.clock !== 0, k = b.calendar !== 0;
			hero.dataset.welcome = w ? "1" : "0";
			hero.dataset.clock = c ? "1" : "0";
			hero.dataset.calendar = k ? "1" : "0";
			hero.dataset.hour = b.clock24 ? "24" : "12";
			hero.hidden = !(w || c || k);
			if (this.els) { this._last = {}; this.tick(true); }
		},
	};

	/* ---------- mount / unmount ---------- */
	function launcherWrapper() {
		const page = document.getElementById("page-desktop");
		if (!page || page.style.display === "none" || page.offsetParent === null) return null;
		return page.querySelector(".desktop-wrapper");
	}

	function sync() {
		const wrap = launcherWrapper();
		const hero = document.getElementById("uts-hero");
		const b = boot();
		const enabled = b.welcome !== 0 || b.clock !== 0 || b.calendar !== 0;
		if (!wrap || !enabled) {
			if (hero) { Clock.stop(); Clock.els = null; hero.remove(); }
			return;
		}
		if (hero && hero.parentElement === wrap) return;
		if (hero) { Clock.stop(); hero.remove(); }
		const node = document.createElement("section");
		node.id = "uts-hero";
		node.className = "uts-hero";
		node.setAttribute("aria-label", "Welcome");
		const nav = wrap.querySelector(":scope > .desktop-navbar");
		if (nav) nav.after(node); else wrap.prepend(node);
		Clock.build(node);
		Clock.start();
	}

	// setTimeout (not requestAnimationFrame): rAF is paused in background tabs, which would delay mounting
	let pending = 0;
	const schedule = () => { if (!pending) pending = setTimeout(() => { pending = 0; sync(); }, 30); };

	function watch() {
		const page = document.getElementById("page-desktop");
		if (!page) { setTimeout(watch, 300); return; }
		new MutationObserver((muts) => {
			// the clock's own once-a-second updates must not re-trigger the watcher
			if (muts.some((m) => !(m.target.nodeType === 1 ? m.target : m.target.parentElement)?.closest("#uts-hero"))) schedule();
		}).observe(page, { childList: true, subtree: true, attributes: true, attributeFilter: ["style"] });
		schedule();
	}

	uts.clock = Clock;
	$(document).on("page-change", schedule);
	$(document).on("uts:refresh", () => { Clock.syncFlags(); schedule(); });
	document.addEventListener("visibilitychange", () => { if (!document.hidden && Clock.els) Clock.tick(true); });
	$(function () { watch(); });
})();
