app_name = "universal_theme_studio"
app_title = "Universal Theme Studio"
app_publisher = "Universal Theme Studio"
app_description = "Five switchable, sector-neutral themes for Frappe/ERPNext desk, login and website"
app_email = "noreply@example.invalid"
app_license = "mit"
required_apps = ["frappe"]

# Desk (all assets are static files; no core file is touched)
app_include_css = [
	"/assets/universal_theme_studio/css/fonts.css?v=1.9.9",
	"/assets/universal_theme_studio/css/themes.css?v=1.9.9",
	"/assets/universal_theme_studio/css/desk.css?v=1.9.9",
	"/assets/universal_theme_studio/css/wallpaper.css?v=1.9.9",
	"/assets/universal_theme_studio/css/sidebar.css?v=1.9.9",
	"/assets/universal_theme_studio/css/welcome.css?v=1.9.9",
]
app_include_js = [
	"/assets/universal_theme_studio/js/uts.js?v=1.9.9",
	"/assets/universal_theme_studio/js/theme_ui.js?v=1.9.9",
	"/assets/universal_theme_studio/js/print_studio.js?v=1.9.9",
	"/assets/universal_theme_studio/js/report_print.js?v=1.9.11",
	"/assets/universal_theme_studio/js/welcome.js?v=1.9.9",
]

# Login page + website
web_include_css = [
	"/assets/universal_theme_studio/css/fonts.css?v=1.9.9",
	"/assets/universal_theme_studio/css/themes.css?v=1.9.9",
	"/assets/universal_theme_studio/css/login.css?v=1.9.9",
	"/assets/universal_theme_studio/css/login_designs.css?v=1.9.9",
]
web_include_js = [
	"/assets/universal_theme_studio/js/uts_web.js?v=1.9.9",
	"/assets/universal_theme_studio/js/login_designer.js?v=1.9.9",
]

before_request = ["universal_theme_studio.login_language.default_language"]

# {{ uts_print(doc) }} in the "Print Studio - <DocType>" Print Formats
jinja = {"methods": ["universal_theme_studio.print_studio.engine.uts_print"]}

# Per-site settings are injected as an inline <style> into website/login pages,
# and into frappe.boot for the desk.
update_website_context = "universal_theme_studio.theme.update_website_context"
extend_bootinfo = "universal_theme_studio.theme.extend_bootinfo"

after_install = "universal_theme_studio.install.after_install"

# Users can only ever reach their own Theme User Preference row (the whitelisted API is the normal path)
has_permission = {
	"Theme User Preference": "universal_theme_studio.permissions.has_permission",
	"Report Print Preference": "universal_theme_studio.permissions.pref_has_permission",
}
permission_query_conditions = {
	"Theme User Preference": "universal_theme_studio.permissions.query_conditions",
	"Report Print Preference": "universal_theme_studio.permissions.pref_query_conditions",
}
