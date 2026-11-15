from frappe.model.document import Document


class ReportPrintPreference(Document):
	"""One row per user (name = user). Written only through print_studio.report_api.save_preference."""
