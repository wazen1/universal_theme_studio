/* Theme Studio (route kept as theme-gallery): admin page with themes, wallpaper presets and the Font Manager.
   Users get the same pickers (without the wallpaper/mode extras) in the "Theme" dialog; all logic lives in public/js/theme_ui.js.
   Everything here only changes the current user's own preferences, through frappe.uts (-> validated API). */
frappe.pages["theme-gallery"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({ parent: wrapper, title: __("Theme Studio"), single_column: true });
	const $body = $(`<div class="uts-gallery"></div>`).appendTo(page.main);
	frappe.uts.ui.mountPicker($body, { admin: true });
};
