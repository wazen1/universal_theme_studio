/* Login / website runtime: follow system dark mode when mode is "auto". */
(function () {
	var d = document.documentElement;
	// Mode "auto" follows the OS; the organization default mode is written into the page by the server.
	var pref = d.getAttribute("data-uts-mode-pref");
	if (pref === "auto") {
		var mq = matchMedia("(prefers-color-scheme: dark)");
		var set = function () { var v = mq.matches ? "dark" : "light"; d.setAttribute("data-uts-mode", v); d.setAttribute("data-theme", v); };
		set(); mq.addEventListener("change", set);
	}
	document.addEventListener("DOMContentLoaded", function () {
		var card = document.querySelector(".page-card-head");
		var u = window.__uts_login;
		if (!card || !u) return;
		if (u.design && u.design !== "classic") return; // the new login designs build their own headline
		var t = card.querySelector("h4");
		if (u.title && t) t.textContent = u.title;
		var s = card.querySelector(".page-card-subtitle");
		if (u.subtitle && s) s.textContent = u.subtitle;
		if (u.logo) { var img = card.querySelector(".app-logo"); if (img) img.src = u.logo; }
	});
})();
