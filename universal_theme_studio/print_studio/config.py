"""Static configuration of the Print Studio: designs, palettes, fonts and the supported DocTypes.

Adding a DocType later: either add an entry to SUPPORTED below, or (from another app) declare it through the
`uts_print_doctypes` hook (a dotted path to a function returning {"DocType": {...same keys as below...}})."""

import frappe

DESIGN_LABELS = {
	"Classic Gold": "classic-gold",
	"Modern Blue": "modern-blue",
	"Elegant Teal": "elegant-teal",
	"Purple Wave": "purple-wave",
	"Executive Document": "executive-document",
	"Creative Corporate": "creative-corporate",
	"Business Classic": "business-classic",
	"Info Card": "info-card",
	"Full Band": "full-band",
	"Number Tile": "number-tile",
}
DESIGN_KEYS = list(DESIGN_LABELS.values())
KEY_TO_LABEL = {v: k for k, v in DESIGN_LABELS.items()}
# default (primary, secondary) of every design
PALETTES = {
	"classic-gold": ("#b8892b", "#7a5a14"),
	"modern-blue": ("#1d4ed8", "#0ea5e9"),
	"elegant-teal": ("#0f766e", "#5eead4"),
	"purple-wave": ("#6d28d9", "#c026d3"),
	"executive-document": ("#1e3a5f", "#94a3b8"),
	"creative-corporate": ("#0f766e", "#d4a017"),
	"business-classic": ("#4f6d8f", "#9aa8b8"),
	"info-card": ("#3b4fa8", "#8f9bd0"),
	"full-band": ("#d9534f", "#f0a09e"),
	"number-tile": ("#f2643a", "#f7b49c"),
}
FONTS = {  # label -> (slug of the bundled TTF in public/fonts/print, CSS family)
	"Tajawal": ("tajawal", "UTSP Tajawal"),
	"Cairo": ("cairo", "UTSP Cairo"),
	"IBM Plex Sans Arabic": ("ibm-plex-sans-arabic", "UTSP IBM Plex Sans Arabic"),
	"Alexandria": ("alexandria", "UTSP Alexandria"),
	"Readex Pro": ("readex-pro", "UTSP Readex Pro"),
	"Almarai": ("almarai", "UTSP Almarai"),
	"Noto Sans Arabic": ("noto-sans-arabic", "UTSP Noto Sans Arabic"),
	"Rubik": ("rubik", "UTSP Rubik"),
}
SIZES = {"Small": 9.5, "Medium": 10.5, "Large": 11.5}  # pt
MARGINS = {"Narrow": 8, "Normal": 12, "Wide": 18}  # mm
TABLE_STYLES = {"Striped": "striped", "Lined": "lined", "Bordered": "bordered", "Minimal": "minimal"}
LANG_MODES = {
	"Auto (document / user language)": "auto",
	"Arabic": "ar",
	"English": "en",
	"Bilingual (Arabic + English)": "both",
}
QR_CONTENT = {"Document URL": "url", "Document Number and Total": "number"}
PRINT_FORMAT_PREFIX = "Print Studio - "


def L(en, ar):
	return {"en": en, "ar": ar}


def col(field, en, ar, kind="text", width=None):
	return {"field": field, "label": L(en, ar), "kind": kind, "width": width}


# ---- reusable pieces -------------------------------------------------------------------------
ITEM_COLS = [
	col("idx", "#", "#", "idx", 4),
	col("item", "Item", "الصنف", "item"),
	col("qty", "Qty", "الكمية", "num", 9),
	col("uom", "Unit", "الوحدة", "text", 8),
	col("rate", "Rate", "السعر", "num", 18),
	col("discount_percentage", "Disc. %", "الخصم %", "num_opt", 8),
	col("amount", "Amount", "المبلغ", "num", 20),
]
DN_COLS = [
	col("idx", "#", "#", "idx", 4),
	col("item", "Item", "الصنف", "item"),
	col("qty", "Qty", "الكمية", "num", 10),
	col("uom", "Unit", "الوحدة", "text", 9),
	col("rate", "Rate", "السعر", "num_opt", 18),
	col("amount", "Amount", "المبلغ", "num_opt", 20),
]
COMMON_TOTALS = [
	("total", L("Subtotal", "المجموع الفرعي")),
	("discount_amount", L("Discount", "الخصم")),
	("total_taxes_and_charges", L("Taxes and Charges", "الضرائب والرسوم")),
	("rounding_adjustment", L("Rounding", "التقريب")),
	("grand_total", L("Grand Total", "الإجمالي")),
	("rounded_total", L("Rounded Total", "الإجمالي المقرّب")),
]
TERMS = [("terms", L("Terms & Conditions", "الشروط والأحكام"))]


def trade_doc(title, party_label, name_fields, meta, totals=None, notes=None, cols=None, party_tax=True):
	return {
		"title": title,
		"party_label": party_label,
		"party_name": name_fields,
		"address": "address_display",
		"contact": "contact_display",
		"party_tax_id": "tax_id" if party_tax else None,
		"meta": meta,
		"table": "items",
		"cols": cols or ITEM_COLS,
		"taxes_table": "taxes",
		"totals": totals or COMMON_TOTALS,
		"in_words": "in_words",
		"notes": notes or TERMS,
		"payment_schedule": True,
		"currency_field": "currency",
	}


SUPPORTED = {
	"Sales Invoice": trade_doc(
		L("Sales Invoice", "فاتورة مبيعات"),
		L("Bill To", "فاتورة إلى"),
		["customer_name", "customer"],
		[
			("name", L("Invoice No.", "رقم الفاتورة"), "text"),
			("posting_date", L("Date", "التاريخ"), "date"),
			("due_date", L("Due Date", "تاريخ الاستحقاق"), "date"),
			("po_no", L("Customer PO", "أمر شراء العميل"), "text"),
			("currency", L("Currency", "العملة"), "text"),
		],
		totals=COMMON_TOTALS + [("outstanding_amount", L("Outstanding", "المتبقي"))],
		notes=TERMS + [("remarks", L("Remarks", "ملاحظات"))],
	),
	"Purchase Invoice": trade_doc(
		L("Purchase Invoice", "فاتورة مشتريات"),
		L("Supplier", "المورد"),
		["supplier_name", "supplier"],
		[
			("name", L("Invoice No.", "رقم الفاتورة"), "text"),
			("bill_no", L("Supplier Invoice", "فاتورة المورد"), "text"),
			("posting_date", L("Date", "التاريخ"), "date"),
			("due_date", L("Due Date", "تاريخ الاستحقاق"), "date"),
			("currency", L("Currency", "العملة"), "text"),
		],
		totals=COMMON_TOTALS + [("outstanding_amount", L("Outstanding", "المتبقي"))],
		notes=TERMS + [("remarks", L("Remarks", "ملاحظات"))],
	),
	"Quotation": trade_doc(
		L("Quotation", "عرض سعر"),
		L("Quotation For", "عرض سعر إلى"),
		["customer_name", "party_name"],
		[
			("name", L("Quotation No.", "رقم العرض"), "text"),
			("transaction_date", L("Date", "التاريخ"), "date"),
			("valid_till", L("Valid Till", "صالح حتى"), "date"),
			("currency", L("Currency", "العملة"), "text"),
		],
	),
	"Purchase Order": trade_doc(
		L("Purchase Order", "أمر شراء"),
		L("Supplier", "المورد"),
		["supplier_name", "supplier"],
		[
			("name", L("Order No.", "رقم الأمر"), "text"),
			("transaction_date", L("Date", "التاريخ"), "date"),
			("schedule_date", L("Required By", "مطلوب بتاريخ"), "date"),
			("currency", L("Currency", "العملة"), "text"),
		],
	),
	"Sales Order": trade_doc(
		L("Sales Order", "أمر بيع"),
		L("Customer", "العميل"),
		["customer_name", "customer"],
		[
			("name", L("Order No.", "رقم الأمر"), "text"),
			("transaction_date", L("Date", "التاريخ"), "date"),
			("delivery_date", L("Delivery Date", "تاريخ التسليم"), "date"),
			("po_no", L("Customer PO", "أمر شراء العميل"), "text"),
			("currency", L("Currency", "العملة"), "text"),
		],
	),
	"Delivery Note": trade_doc(
		L("Delivery Note", "إذن تسليم"),
		L("Deliver To", "تسليم إلى"),
		["customer_name", "customer"],
		[
			("name", L("Delivery No.", "رقم التسليم"), "text"),
			("posting_date", L("Date", "التاريخ"), "date"),
			("po_no", L("Customer PO", "أمر شراء العميل"), "text"),
		],
		cols=DN_COLS,
	),
	"Payment Entry": {
		"title": L("Payment Entry", "سند دفع"),
		"title_by": {  # payment_type -> title
			"Receive": L("Receipt Voucher", "سند قبض"),
			"Pay": L("Payment Voucher", "سند صرف"),
			"Internal Transfer": L("Internal Transfer", "تحويل داخلي"),
		},
		"party_label": L("Party", "الطرف"),
		"party_label_by": {"Receive": L("Received From", "استلمنا من"), "Pay": L("Paid To", "دفعنا إلى")},
		"party_name": ["party_name", "party"],
		"address": None,
		"contact": None,
		"party_tax_id": None,
		"meta": [
			("name", L("Voucher No.", "رقم السند"), "text"),
			("posting_date", L("Date", "التاريخ"), "date"),
			("mode_of_payment", L("Payment Mode", "طريقة الدفع"), "text"),
			("reference_no", L("Reference No.", "رقم المرجع"), "text"),
			("reference_date", L("Reference Date", "تاريخ المرجع"), "date"),
			("paid_from", L("Paid From", "من حساب"), "text"),
			("paid_to", L("Paid To", "إلى حساب"), "text"),
		],
		"table": "references",
		"cols": [
			col("idx", "#", "#", "idx", 4),
			col("reference_doctype", "Type", "النوع", "text", 18),
			col("reference_name", "Reference", "المرجع", "text"),
			col("total_amount", "Total", "الإجمالي", "num", 18),
			col("outstanding_amount", "Outstanding", "المتبقي", "num", 18),
			col("allocated_amount", "Allocated", "المخصص", "num", 18),
		],
		"taxes_table": "taxes",
		"taxes_cols": ("description", "tax_amount"),
		"totals": [
			("paid_amount", L("Amount Paid", "المبلغ المدفوع")),
			("received_amount", L("Amount Received", "المبلغ المستلم")),
			("total_allocated_amount", L("Total Allocated", "إجمالي المخصص")),
			("unallocated_amount", L("Unallocated", "غير مخصص")),
			("difference_amount", L("Difference", "الفرق")),
		],
		"grand_field": "paid_amount",
		"in_words": None,
		"notes": [("remarks", L("Remarks", "ملاحظات"))],
		"payment_schedule": False,
		"currency_field": None,
	},
	"Journal Entry": {
		"title": L("Journal Entry", "قيد يومية"),
		"party_label": None,
		"party_name": [],
		"address": None,
		"contact": None,
		"party_tax_id": None,
		"meta": [
			("name", L("Entry No.", "رقم القيد"), "text"),
			("posting_date", L("Date", "التاريخ"), "date"),
			("voucher_type", L("Voucher Type", "نوع القيد"), "text"),
			("cheque_no", L("Cheque No.", "رقم الشيك"), "text"),
			("cheque_date", L("Cheque Date", "تاريخ الشيك"), "date"),
		],
		"table": "accounts",
		"cols": [
			col("idx", "#", "#", "idx", 4),
			col("account", "Account", "الحساب", "text"),
			col("party", "Party", "الطرف", "text", 18),
			col("cost_center", "Cost Center", "مركز التكلفة", "text_opt", 14),
			col("debit_in_account_currency", "Debit", "مدين", "num", 18),
			col("credit_in_account_currency", "Credit", "دائن", "num", 18),
		],
		"taxes_table": None,
		"totals": [
			("total_debit", L("Total Debit", "إجمالي المدين")),
			("total_credit", L("Total Credit", "إجمالي الدائن")),
			("difference", L("Difference", "الفرق")),
		],
		"grand_field": "total_debit",
		"in_words": None,
		"notes": [("user_remark", L("Remarks", "ملاحظات"))],
		"payment_schedule": False,
		"currency_field": None,
	},
}


def supported_doctypes():
	"""Built-in registry plus anything other apps contribute through the `uts_print_doctypes` hook."""
	reg = dict(SUPPORTED)
	for path in frappe.get_hooks("uts_print_doctypes") or []:
		try:
			reg.update(frappe.get_attr(path)() or {})
		except Exception:
			frappe.log_error(title="Print Studio: uts_print_doctypes hook failed")
	return reg
