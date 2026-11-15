import frappe
from frappe.model.document import Document


class ThemeUserPreference(Document):
	def validate(self):
		# One row per user, and it is always that user's name
		self.name = self.user
