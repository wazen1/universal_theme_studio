import frappe
from frappe import _

from universal_theme_studio import theme as _theme

VALID_THEMES = set(_theme.THEMES.values())
VALID_MODES = {"light", "dark", "auto"}
FONT_FIELDS = {"font_interface": "interface", "font_heading": "heading", "font_table": "table", "font_form": "form"}


@frappe.whitelist()
def get_settings():
	return _theme.get_settings()


@frappe.whitelist()
def get_my_preferences():
	"""The signed-in user's own preferences and what they are allowed to change."""
	return _theme.user_payload(frappe.get_cached_doc("Theme Settings"), frappe.session.user)


def _save(user: str, values: dict):
	"""Create or update the user's own preference row (identity always comes from the session)."""
	if frappe.db.exists("Theme User Preference", user):
		doc = frappe.get_doc("Theme User Preference", user)
	else:
		doc = frappe.new_doc("Theme User Preference")
		doc.user = user
	doc.update(values)
	doc.flags.ignore_permissions = True  # authorised above: the row is the caller's own
	doc.save() if not doc.is_new() else doc.insert()
	frappe.clear_cache(user=user)  # drop the cached boot payload so other devices/browsers load the new values


@frappe.whitelist(methods=["POST"])
def set_user_preference(
	theme: str | None = None,
	mode: str | None = None,
	wallpaper: str | None = None,
	font_interface: str | None = None,
	font_heading: str | None = None,
	font_table: str | None = None,
	font_form: str | None = None,
):
	"""Persist the signed-in user's choices. There is deliberately no `user` argument: a caller can only
	ever change their own preferences. Empty string clears a value (back to the organization default);
	None leaves it unchanged."""
	user = frappe.session.user
	if user == "Guest":
		frappe.throw(_("Please sign in"), frappe.PermissionError)

	s = frappe.get_cached_doc("Theme Settings")
	admin = _theme._is_admin(user)
	values = {}

	# 1) validate identifiers first
	fonts = {"font_interface": font_interface, "font_heading": font_heading, "font_table": font_table, "font_form": font_form}
	if theme is not None and theme and theme not in VALID_THEMES:
		frappe.throw(_("Unknown theme"), frappe.ValidationError)
	if mode is not None and mode and mode not in VALID_MODES:
		frappe.throw(_("Unknown mode"), frappe.ValidationError)
	if wallpaper is not None and wallpaper not in set(_theme.WALLPAPER_PRESETS.values()) | {"", "theme"}:
		frappe.throw(_("Unknown wallpaper"), frappe.ValidationError)
	for field, val in fonts.items():
		if val is not None and val and val not in _theme.FONT_KEYS:
			frappe.throw(_("Unknown font"), frappe.ValidationError)

	# 2) then enforce what the administrator allows
	if theme is not None:
		if not (cint_(s.allow_user_switching) or admin):
			frappe.throw(_("Theme selection is disabled by your administrator"), frappe.PermissionError)
		if theme and theme not in _theme.available_theme_keys(s, user):
			frappe.throw(_("This theme is not available"), frappe.PermissionError)
		values["theme"] = theme
	if wallpaper is not None:
		if not (cint_(s.allow_user_wallpaper) or admin):
			frappe.throw(_("Wallpaper choice is disabled by your administrator"), frappe.PermissionError)
		values["wallpaper"] = wallpaper
	if any(v is not None for v in fonts.values()):
		if not (cint_(s.allow_user_fonts) or admin):
			frappe.throw(_("Font customization is disabled by your administrator"), frappe.PermissionError)
		values.update({k: v for k, v in fonts.items() if v is not None})
	if mode is not None:
		values["mode"] = mode
		if mode:
			desk = {"light": "Light", "dark": "Dark", "auto": "Automatic"}[mode]
			frappe.db.set_value("User", user, "desk_theme", desk, update_modified=False)

	if values:
		_save(user, values)
	return get_my_preferences()


@frappe.whitelist(methods=["POST"])
def reset_my_preferences(scope: str = "theme"):
	"""Back to the administrator's defaults. scope: 'theme' (theme, light/dark, wallpaper - fonts are kept),
	'fonts' (the four fonts only) or 'all'."""
	user = frappe.session.user
	if user == "Guest":
		frappe.throw(_("Please sign in"), frappe.PermissionError)
	if scope not in ("theme", "fonts", "all"):
		frappe.throw(_("Unknown reset scope"), frappe.ValidationError)
	values = {}
	if scope in ("theme", "all"):
		values.update({"theme": "", "mode": "", "wallpaper": ""})
	if scope in ("fonts", "all"):
		values.update({"font_interface": "", "font_heading": "", "font_table": "", "font_form": ""})
	if frappe.db.exists("Theme User Preference", user):
		_save(user, values)
	if scope in ("theme", "all"):
		org_mode = _theme.MODES.get(frappe.get_cached_doc("Theme Settings").default_mode, "light")
		frappe.db.set_value(
			"User", user, "desk_theme", {"light": "Light", "dark": "Dark", "auto": "Automatic"}[org_mode], update_modified=False
		)
		frappe.clear_cache(user=user)
	return get_my_preferences()


def cint_(v):
	return 1 if frappe.utils.cint(v) else 0
