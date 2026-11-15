from universal_theme_studio.print_studio import provision


def execute():
	"""Register the Business Classic design as a Print Style (doctype options come from the synced JSON)."""
	provision.ensure_print_styles()
