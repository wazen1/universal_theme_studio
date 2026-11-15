from universal_theme_studio.print_studio import provision


def execute():
	"""Register Info Card, Full Band and Number Tile as Print Styles."""
	provision.ensure_print_styles()
