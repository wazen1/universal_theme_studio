import os

import frappe
from frappe import _
from frappe.model.document import Document

from universal_theme_studio.print_studio import config as C
from universal_theme_studio.print_studio import provision, settings as S


class PrintDesignerSettings(Document):
	def validate(self):
		for field in ("primary_color", "secondary_color"):
			if self.get(field) and not S.safe_hex(self.get(field)):
				frappe.throw(_("{0}: please use a #RRGGBB colour").format(self.meta.get_label(field)))
		self.header_text = S.clean_text(self.header_text, 140)
		self.footer_text = S.clean_text(self.footer_text, 400)
		self.signature_labels = ", ".join([S.clean_text(x, 40) for x in (self.signature_labels or "").split(",") if S.clean_text(x, 40)][:3])
		self.validate_logo()
		self.validate_assignments()

	def validate_logo(self):
		if not self.logo:
			return
		ext = os.path.splitext(self.logo.split("?")[0])[1].lower()
		if ext not in (".png", ".jpg", ".jpeg", ".webp", ".svg"):
			frappe.throw(_("Logo: only PNG, JPG, WEBP or SVG files are allowed"))
		name = frappe.db.get_value("File", {"file_url": self.logo}, "name")
		if name:
			f = frappe.get_doc("File", name)
			if f.file_size and f.file_size > 1024 * 1024:
				frappe.throw(_("Logo is larger than 1 MB"))
			if f.is_private:  # PDFs are fetched without a session, so the logo must be public
				f.is_private = 0
				f.save(ignore_permissions=True)
				self.logo = f.file_url
		if not S.safe_url(self.logo):
			frappe.throw(_("Logo: unsupported file location"))

	def validate_assignments(self):
		supported, seen = C.supported_doctypes(), set()
		for r in list(self.get("assignments") or []):
			if r.doc_type not in supported:
				frappe.throw(_("{0} is not supported by the Print Studio").format(r.doc_type))
			if r.doc_type in seen:
				frappe.throw(_("{0} appears more than once").format(r.doc_type))
			seen.add(r.doc_type)

	def on_update(self):
		provision.sync(self, self.get_doc_before_save())
