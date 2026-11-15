import frappe
from frappe.model.document import Document


class ThemeSettings(Document):
	def validate(self):
		self.validate_login_assets()
		self.ensure_sidebar_rows()
		self.login_overlay = min(max(self.login_overlay or 0, 0), 100)
		self.workspace_overlay = min(max(self.workspace_overlay or 0, 0), 100)
		self.desktop_overlay = min(max(self.desktop_overlay or 0, 0), 100)
		self.desktop_glass_opacity = min(max(self.desktop_glass_opacity or 0, 0), 100)
		self.desktop_blur = min(max(self.desktop_blur or 0, 0), 30)

	def validate_login_assets(self):
		"""Login images must be real, small, public raster images (logo may also be SVG); colours must be plain colours."""
		import os

		rules = {"login_background_image": ({".jpg", ".jpeg", ".png", ".webp"}, 5), "login_logo": ({".jpg", ".jpeg", ".png", ".webp", ".svg"}, 1)}
		for field, (exts, max_mb) in rules.items():
			url = self.get(field)
			if not url:
				continue
			ext = os.path.splitext(url.split("?")[0])[1].lower()
			if ext not in exts:
				frappe.throw(_("{0}: only {1} files are allowed").format(self.meta.get_label(field), ", ".join(sorted(exts))))
			name = frappe.db.get_value("File", {"file_url": url}, "name")
			if not name:
				continue
			doc = frappe.get_doc("File", name)
			if doc.file_size and doc.file_size > max_mb * 1024 * 1024:
				frappe.throw(_("{0} is larger than {1} MB").format(self.meta.get_label(field), max_mb))
			if doc.is_private:
				# the login page is public, so a private upload could never be shown: publish it (moves the file)
				doc.is_private = 0
				doc.save(ignore_permissions=True)
				self.set(field, doc.file_url)
		for field in ("login_card_color", "login_button_color"):
			from universal_theme_studio.theme import safe_color

			if self.get(field) and not safe_color(self.get(field)):
				frappe.throw(_("{0}: not a valid colour").format(self.meta.get_label(field)))
		if len(self.get("login_features") or []) > 3:
			frappe.throw(_("Login Feature Cards: at most 3 are shown, please keep 3 or fewer rows"))

	def ensure_sidebar_rows(self):
		"""Exactly one sidebar row per theme; missing themes get their defaults."""
		from universal_theme_studio.theme import SIDEBAR_DEFAULTS

		seen = set()
		for row in list(self.sidebar_options or []):
			if row.theme in seen or row.theme not in SIDEBAR_DEFAULTS:
				self.remove(row)
			seen.add(row.theme)
		for theme, (a, p, act, w, ic) in SIDEBAR_DEFAULTS.items():
			if theme not in seen:
				self.append(
					"sidebar_options",
					{"theme": theme, "appearance": a, "pattern": p, "active_style": act, "width": w, "icon_style": ic},
				)
		order = list(SIDEBAR_DEFAULTS)
		self.sidebar_options.sort(key=lambda r: order.index(r.theme))
		for i, r in enumerate(self.sidebar_options, 1):
			r.idx = i

	def on_update(self):
		frappe.clear_cache()
