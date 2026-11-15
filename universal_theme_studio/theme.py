"""Server-side glue: settings -> inline CSS variables, boot info, website context."""

import frappe
from frappe.utils import cint

THEMES = {
	"Fiori Blue": "fiori-blue",
	"Redwood Purple": "redwood-purple",
	"Emerald Modern": "emerald-modern",
	"Midnight Pro": "midnight-pro",
	"Sandstone Premium": "sandstone-premium",
	"Ocean Breeze": "ocean-breeze",
	"Sunset Fusion": "sunset-fusion",
	"Forest Harmony": "forest-harmony",
	"Royal Indigo": "royal-indigo",
	"Modern Teal": "modern-teal",
	"Carbon Pro": "carbon-pro",
}
WALLPAPER_PRESETS = {
	"Mint Soft": "mint-soft",
	"Rose Elegant": "rose-elegant",
	"Sky Glass": "sky-glass",
	"Amber Light": "amber-light",
	"Slate Modern": "slate-modern",
	"Arctic White": "arctic-white",
}
GRADIENT_DIRECTIONS = {
	"To Right": "90deg",
	"To Bottom": "180deg",
	"To Bottom Right": "135deg",
	"To Top Right": "45deg",
	"To Bottom Left": "225deg",
}
MODES = {"Light": "light", "Dark": "dark", "Automatic": "auto"}
_FB = ", system-ui, -apple-system, 'Segoe UI', sans-serif"
# label -> (key, css family); keys are what is stored per user, labels are what Theme Settings shows
FONT_CHOICES = {
	"Tajawal": ("tajawal", '"UTS Tajawal"' + _FB),
	"Cairo": ("cairo", '"UTS Cairo"' + _FB),
	"IBM Plex Sans Arabic": ("ibm-plex-sans-arabic", '"UTS IBM Plex Sans Arabic"' + _FB),
	"Alexandria": ("alexandria", '"UTS Alexandria"' + _FB),
	"Readex Pro": ("readex-pro", '"UTS Readex Pro"' + _FB),
	"Almarai": ("almarai", '"UTS Almarai"' + _FB),
	"Noto Sans Arabic": ("noto-sans-arabic", '"UTS Noto Sans Arabic"' + _FB),
	"Rubik": ("rubik", '"UTS Rubik"' + _FB),
	"System": ("system", "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"),
}
FONTS = {label: css for label, (_k, css) in FONT_CHOICES.items()}  # legacy name, still used by build_css
FONT_KEYS = {key: css for _l, (key, css) in FONT_CHOICES.items()}
FONT_LABEL_TO_KEY = {label: key for label, (key, _c) in FONT_CHOICES.items()}
FONT_ROLES = ("interface", "heading", "table", "form")
RADIUS = {"Sharp": ("3px", "4px", "6px"), "Rounded": ("6px", "10px", "14px"), "Soft": ("10px", "16px", "24px")}
SCALE = {"Small": "13px", "Medium": "14px", "Large": "15.5px"}
DENSITY = {"Compact": "30px", "Comfortable": "38px", "Spacious": "48px"}


SIDEBAR_DEFAULTS = {
	"Fiori Blue": ("Gradient", "Geometric Lines", "Colored Indicator", "Comfortable", "Standard"),
	"Redwood Purple": ("Glass", "Abstract Shapes", "Rounded Highlight", "Comfortable", "Rounded Background"),
	"Emerald Modern": ("Gradient", "Curved Lines", "Gradient Highlight", "Comfortable", "Rounded Background"),
	"Midnight Pro": ("Gradient", "Geometric Lines", "Colored Indicator", "Comfortable", "Standard"),
	"Sandstone Premium": ("Classic", "Geometric Lines", "Rounded Highlight", "Comfortable", "Standard"),
	"Ocean Breeze": ("Glass", "Soft Waves", "Rounded Highlight", "Comfortable", "Rounded Background"),
	"Sunset Fusion": ("Gradient", "Abstract Shapes", "Gradient Highlight", "Comfortable", "Rounded Background"),
	"Forest Harmony": ("Classic", "Curved Lines", "Colored Indicator", "Comfortable", "Standard"),
	"Royal Indigo": ("Gradient", "Geometric Lines", "Gradient Highlight", "Comfortable", "Rounded Background"),
	"Modern Teal": ("Classic", "Soft Waves", "Rounded Highlight", "Comfortable", "Standard"),
	"Carbon Pro": ("Gradient", "Geometric Lines", "Colored Indicator", "Comfortable", "Standard"),
}


def _slug(v):
	return (v or "").lower().replace(" ", "-")


def sidebar_map(s):
	"""{theme-key: {appearance, pattern, active, width, icons}} - missing rows fall back to defaults."""
	rows = {r.theme: r for r in (s.get("sidebar_options") or [])}
	out = {}
	for label, key in THEMES.items():
		a, p, act, w, ic = SIDEBAR_DEFAULTS[label]
		r = rows.get(label)
		if r:
			a, p, act, w, ic = r.appearance or a, r.pattern or p, r.active_style or act, r.width or w, r.icon_style or ic
		out[key] = {
			"appearance": _slug(a),
			"pattern": _slug(p),
			"active": _slug(act),
			"width": _slug(w),
			"icons": "rounded" if ic == "Rounded Background" else "standard",
		}
	return out


def _is_admin(user=None):
	return "System Manager" in frappe.get_roles(user or frappe.session.user)


def available_theme_keys(s, user=None):
	"""Themes a user may pick: everything for System Managers, else the admin's list (empty = all)."""
	allv = list(THEMES.values())
	if _is_admin(user):
		return allv
	rows = [THEMES.get(r.theme) for r in (s.get("available_themes") or [])]
	rows = [k for k in rows if k]
	return rows or allv


def org_theme_key(s):
	"""Organization default theme, falling back when it is not in the available list."""
	avail = [THEMES.get(r.theme) for r in (s.get("available_themes") or []) if THEMES.get(r.theme)] or list(THEMES.values())
	for cand in (THEMES.get(s.default_theme), THEMES.get(s.default_theme_fallback)):
		if cand and cand in avail:
			return cand
	return avail[0]


def org_fonts(s):
	"""Organization default fonts as keys ('' = follow the theme / the interface font)."""
	ui = FONT_LABEL_TO_KEY.get(s.font_family, "") if s.font_family != "Theme Default" else ""
	return {
		"interface": ui,
		"heading": FONT_LABEL_TO_KEY.get(s.org_font_heading, ""),
		"table": FONT_LABEL_TO_KEY.get(s.org_font_table, ""),
		"form": FONT_LABEL_TO_KEY.get(s.org_font_form, ""),
	}


def get_pref(user):
	"""A user's saved preferences (dedicated DocType; legacy Defaults only as a fallback)."""
	empty = {"theme": "", "mode": "", "wallpaper": "", "font_interface": "", "font_heading": "", "font_table": "", "font_form": ""}
	if user == "Guest":
		return empty
	row = frappe.db.get_value("Theme User Preference", user, list(empty), as_dict=True)
	if row:
		return {k: (row.get(k) or "") for k in empty}
	legacy = {
		k: frappe.db.get_value("DefaultValue", {"parent": user, "defkey": d}, "defvalue") or ""
		for k, d in (("theme", "uts_theme"), ("mode", "uts_mode"), ("wallpaper", "uts_wallpaper"))
	}
	return {**empty, **legacy}


def user_payload(s, user):
	"""Per-user part of the boot payload: raw prefs, effective values (after admin rules) and permissions."""
	admin = _is_admin(user)
	avail = available_theme_keys(s, user)
	can_theme = bool(cint(s.allow_user_switching)) or admin
	can_fonts = bool(cint(s.allow_user_fonts)) or admin
	can_wp = bool(cint(s.allow_user_wallpaper)) or admin
	pref = get_pref(user)
	o_theme = org_theme_key(s)
	o_mode = MODES.get(s.default_mode, "light")
	o_fonts = org_fonts(s)

	theme = pref["theme"] if (can_theme and pref["theme"] in avail) else o_theme
	mode = pref["mode"] if pref["mode"] in ("light", "dark", "auto") else o_mode
	wallpaper = pref["wallpaper"] if can_wp else ""
	user_fonts = {r: (pref["font_" + r] if can_fonts and pref["font_" + r] in FONT_KEYS else "") for r in FONT_ROLES}
	fonts = {}
	for r in FONT_ROLES:
		fonts[r] = user_fonts[r] or o_fonts[r]
	return {
		# legacy keys kept for backward compatibility with older clients
		"user_theme": pref["theme"],
		"user_mode": pref["mode"],
		"user_wallpaper": pref["wallpaper"],
		"allow_user_fonts": cint(s.allow_user_fonts),
		"prefs": {"theme": pref["theme"], "mode": pref["mode"], "wallpaper": pref["wallpaper"], "fonts": {r: pref["font_" + r] for r in FONT_ROLES}},
		"effective": {"theme": theme, "mode": mode, "wallpaper": wallpaper, "fonts": fonts},
		"org": {"theme": o_theme, "mode": o_mode, "fonts": o_fonts},
		"available": avail,
		"flags": {"theme": can_theme, "fonts": can_fonts, "wallpaper": can_wp},
		"font_list": [{"key": key, "label": label, "family": css} for label, (key, css) in FONT_CHOICES.items()],
	}


def get_settings():
	s = frappe.get_cached_doc("Theme Settings")
	out = {
		"default_theme": org_theme_key(s),
		"default_mode": MODES.get(s.default_mode, "light"),
		"allow_user_switching": cint(s.allow_user_switching),
		"density": (s.table_density or "Comfortable").lower(),
		"sidebar": sidebar_map(s),
		"allow_wallpaper_choice": cint(s.allow_user_wallpaper),
		"wp_preset": WALLPAPER_PRESETS.get(s.desktop_wallpaper_preset, ""),
		"wp_custom": {
			"all": 1 if s.desktop_wallpaper_all else 0,
			**{key: 1 if s.get("wp_" + key.replace("-", "_")) else 0 for key in THEMES.values()},
		},
		"welcome": cint(s.desktop_show_welcome),
		"clock": cint(s.desktop_show_clock),
		"calendar": cint(s.desktop_show_calendar),
		"clock24": 1 if s.desktop_clock_format == "24-hour" else 0,
		"wallpaper": cint(s.desktop_wallpaper_enabled),
		"glass": cint(s.desktop_glass_cards),
		"themes": [{"label": k, "key": v} for k, v in THEMES.items()],
		"css": build_css(s),
	}
	if frappe.session.user != "Guest":
		out.update(user_payload(s, frappe.session.user))
	return out


def _url(v):
	return 'url("{}")'.format(v.replace('"', "%22").replace("\\", "/")) if v else "none"


def build_css(s):
	"""Site-wide overrides, as a :root block. Only emits what was configured."""
	v = {}
	if s.primary_color:
		v["--uts-primary-override"] = s.primary_color
	if s.accent_color:
		v["--uts-accent-override"] = s.accent_color
	if s.font_family and s.font_family != "Theme Default":
		v["--uts-font-override"] = FONTS.get(s.font_family)
	for role, key in (("heading", FONT_LABEL_TO_KEY.get(s.org_font_heading)), ("table", FONT_LABEL_TO_KEY.get(s.org_font_table)), ("form", FONT_LABEL_TO_KEY.get(s.org_font_form))):
		if key:
			v[f"--uts-f-{role}"] = FONT_KEYS[key]
	r = RADIUS.get(s.corner_style or "Rounded")
	v["--uts-r-sm"], v["--uts-r-md"], v["--uts-r-lg"] = r
	v["--uts-font-size"] = SCALE.get(s.font_scale or "Medium")
	v["--uts-row-h"] = DENSITY.get(s.table_density or "Comfortable")
	v["--uts-ws-image"] = _url(s.workspace_background)
	v["--uts-ws-overlay"] = f"{cint(s.workspace_overlay)}%"
	v["--uts-login-image"] = _url(s.login_background_image)
	v["--uts-login-overlay"] = f"{cint(s.login_overlay) / 100:.2f}"
	if s.login_background_color:
		v["--uts-login-bg"] = s.login_background_color
	pos = (s.desktop_wallpaper_position or "Center").lower()
	v["--uts-wp-fit"] = "contain" if s.desktop_wallpaper_fit == "Contain" else "cover"
	v["--uts-wp-pos"] = pos
	v["--uts-wp-overlay"] = f"{min(max(cint(s.desktop_overlay), 0), 100) / 100:.2f}"
	v["--uts-wp-blur"] = f"{min(max(cint(s.desktop_blur), 0), 30)}px"
	v["--uts-glass-a"] = f"{min(max(cint(s.desktop_glass_opacity), 0), 100) / 100:.2f}"
	if s.desktop_wallpaper_all:
		v["--uts-wp-all"] = _url(s.desktop_wallpaper_all)
	for label, key in THEMES.items():
		img = s.get("wp_" + key.replace("-", "_"))
		if img:
			v[f"--uts-wp-img-{key}"] = _url(img)
	if s.secondary_color:
		v["--uts-secondary-override"] = s.secondary_color
	d = GRADIENT_DIRECTIONS.get(s.gradient_direction)
	if d:
		v["--uts-gdir"] = d
	if s.glass_transparency is not None and cint(s.glass_transparency) != 50:
		# 50 = built-in look; 0 = fully clear glass, 100 = near opaque (multiplier on the glass alphas)
		v["--uts-glass-k-set"] = f"{min(max(cint(s.glass_transparency), 0), 100) / 50:.2f}"
	if s.login_background_image:
		v["--uts-lg-image-set"] = _url(s.login_background_image)
	if LOGIN_RADIUS.get(s.login_card_radius):
		v["--uts-lg-radius"] = f"{LOGIN_RADIUS[s.login_card_radius]}px"
	if s.login_glass is not None and cint(s.login_glass) != 50:
		v["--uts-lg-k"] = f"{min(max(cint(s.login_glass), 0), 100) / 50:.2f}"
	if safe_color(s.login_button_color):
		v["--uts-login-btn"] = safe_color(s.login_button_color)
	if safe_color(s.login_card_color):
		v["--uts-login-card"] = safe_color(s.login_card_color)
	css = ":root{" + ";".join(f"{k}:{val}" for k, val in v.items()) + "}"
	sb = {
		"Primary to Secondary": ("var(--uts-p)", "var(--uts-s)"),
		"Primary to Accent": ("var(--uts-p)", "var(--uts-a)"),
		"Secondary to Accent": ("var(--uts-s)", "var(--uts-a)"),
	}.get(s.sidebar_gradient)
	if sb:
		css += (
			"\nhtml[data-uts-theme]{"
			f"--uts-sb-g1:color-mix(in srgb,{sb[0]} 72%,#000);--uts-sb-g2:{sb[0]};--uts-sb-g3:{sb[1]}"
			"}"
		)
	if s.custom_css:
		css += "\n" + s.custom_css
	return css.replace("</", "<\\/")


def extend_bootinfo(bootinfo):
	if frappe.session.user == "Guest":
		return
	bootinfo.uts = get_settings()
	try:
		from universal_theme_studio.print_studio import report_api

		bootinfo.uts["report_print"] = report_api.boot_payload()
	except Exception:
		frappe.log_error(title="UTS report print boot")


LOGIN_DESIGNS = {
	"Fiori Blue": "fiori-blue",
	"Redwood Purple": "redwood-purple",
	"Emerald Modern": "emerald-modern",
	"Midnight Pro": "midnight-pro",
	"Sandstone Premium": "sandstone-premium",
	"Ocean Breeze": "ocean-breeze",
	"Sunset Fusion": "sunset-fusion",
	"Forest Harmony": "forest-harmony",
	"Royal Indigo": "royal-indigo",
	"Modern Teal": "modern-teal",
	"Carbon Pro": "carbon-pro",
}
LOGIN_RADIUS = {"Sharp": 6, "Rounded": 14, "Soft": 22, "Extra Soft": 32}
LOGIN_POSITIONS = {"Start": "start", "Center": "center", "End": "end"}
LOGIN_ICONS = ("shield", "bolt", "chart", "users", "globe", "lock", "clock", "layers")
LOGIN_TEXT_DEFAULTS = {
	"en": ("Welcome back", "Sign in to continue to your workspace."),
	"ar": ("مرحبًا بعودتك", "سجّل دخولك للمتابعة إلى مساحة عملك."),
}
LOGIN_FEATURE_DEFAULTS = [
	("shield", ("Secure access", "Your data is protected end to end."), ("وصول آمن", "بياناتك محمية بالكامل.")),
	("chart", ("Live insights", "Dashboards and reports in real time."), ("رؤى فورية", "لوحات وتقارير لحظية.")),
	("globe", ("Arabic & English", "Full right-to-left support."), ("عربي وإنجليزي", "دعم كامل للاتجاهين.")),
]
_COLOR_RE = __import__("re").compile(r"^(#[0-9a-fA-F]{3,8}|rgba?\([\d\s.,%/]+\))$")


def safe_color(v):
	"""Only plain hex / rgb(a) colours may reach the page's CSS."""
	v = (v or "").strip()
	return v if _COLOR_RE.match(v) else ""


def login_design_key(s, preferred=None):
	"""'native' | 'classic' | a design key. `preferred` = theme key remembered in this browser (cookie, theme name only)."""
	d = s.login_design or "Match Organization Theme"
	if d == "Match Organization Theme" and cint(s.get("login_follow_user_theme")) and preferred in LOGIN_DESIGNS.values():
		return preferred
	if d == "Native Frappe Login":
		return "native"
	if d.startswith("Classic"):
		return "classic"
	if d in LOGIN_DESIGNS:
		return LOGIN_DESIGNS[d]
	org = org_theme_key(s)
	return org if org in LOGIN_DESIGNS.values() else "classic"


def _clip(v, n):
	return (v or "").strip()[:n]


def login_config(s, preferred=None):
	"""Everything the login runtime needs: organization settings plus, optionally, the theme name last used in this browser."""
	design = login_design_key(s, preferred)
	texts = {}
	for lang, col in (("en", ""), ("ar", "_ar")):
		d_title, d_sub = LOGIN_TEXT_DEFAULTS[lang]
		texts[lang] = {
			"title": _clip(s.get("login_title" + col), 140) or d_title,
			"subtitle": _clip(s.get("login_subtitle" + col), 300) or d_sub,
		}
	feats = []
	for r in (s.get("login_features") or [])[:3]:
		icon = r.icon if r.icon in LOGIN_ICONS else "shield"
		feats.append(
			{
				"icon": icon,
				"en": {"title": _clip(r.title, 60), "text": _clip(r.text, 160)},
				"ar": {"title": _clip(r.title_ar, 60), "text": _clip(r.text_ar, 160)},
			}
		)
	if not feats:
		feats = [{"icon": i, "en": {"title": e[0], "text": e[1]}, "ar": {"title": a[0], "text": a[1]}} for i, e, a in LOGIN_FEATURE_DEFAULTS]
	langs = [
		l for l in ("en", "ar") if frappe.db.get_value("Language", l, "enabled")
	] or ["en"]
	return {
		"design": design,
		"theme": design if design in LOGIN_DESIGNS.values() else org_theme_key(s),
		"position": LOGIN_POSITIONS.get(s.login_card_position, "design"),
		"radius": LOGIN_RADIUS.get(s.login_card_radius, 0),
		"glass": min(max(cint(s.login_glass if s.login_glass is not None else 50), 0), 100),
		"overlay": min(max(cint(s.login_overlay), 0), 100) / 100,
		"showFeatures": bool(cint(s.login_show_features)),
		"image": s.login_background_image or "",
		"logo": s.login_logo or "",
		"cardColor": safe_color(s.login_card_color),
		"buttonColor": safe_color(s.login_button_color),
		"title": s.login_title or "",
		"subtitle": s.login_subtitle or "",
		"texts": texts,
		"features": feats,
		"langs": langs,
	}



def update_website_context(context):
	"""Inline the theme into login/website <head> (no flash). Guests get the organization default / the chosen
	login design; signed-in website users get their own theme. Nothing user-specific is exposed to guests."""
	import json

	s = frappe.get_cached_doc("Theme Settings")
	is_login = (getattr(frappe.local, "request", None) is not None) and frappe.request.path.rstrip("/") == "/login"
	t = org_theme_key(s)
	m = MODES.get(s.default_mode, "light")
	preferred = None
	if is_login and frappe.session.user == "Guest":
		# only a theme *name* stored in this browser's own cookie; validated against the fixed list
		c = frappe.request.cookies.get("uts_login_theme")
		preferred = c if c in LOGIN_DESIGNS.values() else None
	cfg = login_config(s, preferred)
	extra = ""
	if frappe.session.user != "Guest":
		eff = user_payload(s, frappe.session.user)["effective"]
		t, m = eff["theme"], eff["mode"]
		vars_ = {f"--uts-f-{r}": FONT_KEYS[eff["fonts"][r]] for r in ("heading", "table", "form") if eff["fonts"][r]}
		if eff["fonts"]["interface"]:
			vars_["--uts-font-override"] = FONT_KEYS[eff["fonts"]["interface"]]
		if vars_:
			extra = "<style id=\"uts-user-fonts\">:root{" + ";".join(f"{k}:{v}" for k, v in vars_.items()) + "}</style>"
	elif is_login and cfg["design"] != "native":
		t = cfg["theme"]
		if cfg["design"] in LOGIN_DESIGNS.values():
			m = "light"  # the six designs define their own light/dark glass
	context.uts = frappe._dict(
		theme=t,
		mode=m,
		layout={"Centered": "center", "Split Left": "left", "Split Right": "right"}.get(s.login_layout, "center"),
		logo=s.login_logo,
		title=s.login_title or "",
		subtitle=s.login_subtitle or "",
	)
	if is_login and frappe.session.user == "Guest" and cfg["design"] == "native":
		return  # safe fallback: the untouched native Frappe login page
	cfg_js = json.dumps(cfg).replace("</", "<\\/")
	design_attr = cfg["design"] if (is_login and frappe.session.user == "Guest" and cfg["design"] in LOGIN_DESIGNS.values()) else ""
	context.head_html = (
		(context.get("head_html") or "")
		+ f'<style id="uts-inline">{build_css(s)}</style>'
		+ extra
		+ f"<script>window.__uts_login={cfg_js};</script>"
		+ f"<script>(function(){{try{{if(/[?&]native=1(&|$)/.test(location.search))return;}}catch(e){{}}var d=document.documentElement,t={t!r},m={m!r};"
		+ "d.setAttribute('data-uts-mode-pref',m);"
		+ "if(m==='auto')m=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';"
		+ "d.setAttribute('data-uts-theme',t);d.setAttribute('data-uts-mode',m);d.setAttribute('data-theme',m);"
		+ f"d.setAttribute('data-uts-login-layout',{context.uts.layout!r});"
		+ (f"d.setAttribute('data-uts-login-design',{design_attr!r});" if design_attr else "")
		+ "})();</script>"
	)
