# Universal Theme Studio

A sector-neutral theme pack for Frappe / ERPNext v16: five complete themes, a Theme Gallery,
branded login pages, a modernised Workspace, List/Form/child-table styling, Arabic RTL + English LTR,
light/dark modes and responsive layouts.

Nothing in Frappe or ERPNext is modified. The app only uses supported extension points:
`app_include_css/js`, `web_include_css/js`, `extend_bootinfo`, `update_website_context`, a Single DocType and a Desk Page.

## Themes
Fiori Blue · Redwood Purple · Emerald Modern · Midnight Pro · Sandstone Premium (each has light and dark variants).

## Use
* Pick a theme: **Theme Gallery** (user menu / palette icon in the navbar, or `/desk/theme-gallery`). Switching is instant and saved per user.
* Admin defaults: **Theme Settings** (colors, font, text size, corner style, table density, workspace + login backgrounds, logo, custom CSS).
* Fonts (Tajawal, Cairo, IBM Plex Sans Arabic) are bundled (SIL OFL 1.1, from @fontsource) and served locally.

## Install
```
bench get-app /path/to/universal_theme_studio
bench --site yoursite install-app universal_theme_studio
```

## Notes
* The theme font also overrides ERPNext's forced Cairo font for Arabic (`set_arabic_font`).
* Static assets are served as plain files; after changing CSS/JS during development hard-reload the browser.

## Desktop wallpaper (`/desk` launcher)
* Each theme ships its own photographic wallpaper (`public/wallpapers`, 2560px and 1280px variants, Unsplash License, see `CREDITS.md`). Switching themes swaps it instantly.
* **Theme Settings → Desktop Wallpaper**: enable/disable, fit (Cover/Contain), position, overlay opacity, blur, and glass cards with adjustable opacity. **Custom Wallpapers** lets admins upload one image for all themes or one per theme.
* If a custom image is missing it falls back to the theme's built-in photo, then to the theme gradient.
* Scoped with `:has(#page-desktop)`: Frappe keeps `body.desktop-page` on every desk route, so only the visible launcher is styled. Icons, labels, order, links and permissions come from Frappe untouched (paint-only CSS).
* Photo position is physical (not mirrored in RTL). `prefers-reduced-transparency` disables the glass blur.

## Sidebar (icon rail + secondary menu)
Theme Settings → **Sidebar Options per Theme** has one row per theme (Appearance: Classic/Glass/Gradient; Decorative Pattern: None/Geometric Lines/Soft Waves/Abstract Shapes/Curved Lines; Active Item Style: Colored Indicator/Rounded Highlight/Gradient Highlight; Width: Compact/Comfortable/Wide; Icon Style: Standard/Rounded Background). Switching theme applies that theme's row instantly.
* Defaults: Fiori Blue gradient + geometric lines; Redwood Purple glass + translucent circles; Emerald Modern gradient + curved lines; Midnight Pro navy + glowing lines; Sandstone Premium classic beige/copper + geometric lines.
* Pure CSS over the native DOM (`#desk-dock`, `.body-sidebar-container > .body-sidebar`): no markup, link, search, permission or expand/collapse logic is touched. Decorations are `::before` masks with `pointer-events:none`, behind the content, and are hidden while the mobile drawer is closed.
* Logical properties + mirrored artwork for RTL; Arabic disables uppercase/letter-spacing so letters stay joined.

## Welcome header & smart clock (`/desk`)
* Theme Settings → **Desktop Welcome & Clock**: show/hide the welcome message, the clock and the calendar; 12-hour or 24-hour time.
* A single `#uts-hero` node is inserted between Frappe's top bar and the icon grid while the launcher is visible (and removed elsewhere); Frappe's own nodes are untouched. Frappe's 1px separator under the top bar is removed on the launcher only.
* Greeting: **before 12:00 "صباح الخير، name" / from 12:00 "مساء الخير، name"** (English UI: "Good morning/evening, name"), using the user's time zone (`frappe.boot.time_zone.user`, then system, then browser). The icon is a sun between 06:00-17:59, a moon otherwise.
* One timer chain (aligned to the second, cancelled when the hero is removed). Hijri date: **Umm al-Qura** via `Intl` (`islamic-umalqura`); fallbacks: `islamic` (astronomical), then `islamic-civil` (tabular, can differ by +/-1 day), then the Hijri row is hidden. The calendar in use is shown in `data-hijri-calendar` on `#uts-hero`. The Hijri day changes at local midnight (civil Umm al-Qura convention), not at sunset.
* Clock per theme (CSS-only switch): Fiori Blue glass analog, Redwood Purple minimal digital, Emerald Modern circular rings, Midnight Pro illuminated digital, Sandstone Premium classic copper analog.
* Test aid: `frappe.uts.clock.setTime(new Date("2026-11-12T11:59:55"))` shifts the displayed time (no system clock change); `setTime(null)` restores it.

## v1.4 - six mixed-colour themes (additive)
Ocean Breeze, Sunset Fusion, Forest Harmony, Royal Indigo, Modern Teal and Carbon Pro join the original five (11 themes). Each has light + dark palettes, its own desktop photo, sidebar style (see Sidebar Options per Theme), login gradient, clock face and calendar pills, all driven by the same `--uts-*` tokens.
* **Theme Gallery:** 11 cards with a palette strip, **Preview** (temporary, not saved; dropped when you leave the page) and **Apply** (saved), an Active/Previewing badge, and a wallpaper picker.
* **Mixed colours (Theme Settings):** Primary, Secondary and Accent colour; Gradient Direction; Sidebar Gradient (Primary to Secondary, etc.); Glass Transparency (50 = built-in look). Overlay opacities already exist per surface (Desktop Wallpaper / Login / Workspace). Overrides apply to the active theme, so no source edits are needed.
* **Wallpaper presets:** Mint Soft, Rose Elegant, Sky Glass, Amber Light, Slate Modern, Arctic White (generated for this app). Users choose one in the gallery unless "Allow Users to Choose Wallpaper" is off; admins can set a default preset. An uploaded custom wallpaper still wins over the admin default; a user's own choice wins over everything.
* Upgrade is data-safe: new options/fields/rows are only added (patch `v1_4.add_mixed_themes`); existing themes, settings, sidebar rows and user preferences are untouched.

## v1.5 - user preferences & Arabic font manager
* **Per-user preferences** live in the `Theme User Preference` DocType (one row per user, name = user): theme, light/dark/auto, wallpaper and four fonts (interface, headings & cards, tables & data, forms & inputs). They are loaded through `frappe.boot.uts`, so a new browser or device gets them at login; nothing is read from `localStorage` (old keys are cleared). Existing per-user Defaults (`uts_theme`, `uts_mode`, `uts_wallpaper`) were copied into the DocType by patch `v1_5.migrate_user_preferences` and left in place.
* **Theme Studio** (`/desk/theme-gallery`, also in the user menu next to Settings): Themes tab (Preview / Apply / Reset to Default, palette strip, only the themes the administrator allows), wallpaper picker, and a Fonts tab with live Arabic previews. Fonts apply instantly through CSS variables; **Reset to Default** restores theme, mode and wallpaper but keeps fonts, and **Reset fonts to default** restores the four fonts.
* **Eight Arabic fonts** are bundled locally (SIL OFL 1.1): Tajawal, Cairo, IBM Plex Sans Arabic, Alexandria, Readex Pro, Almarai, Noto Sans Arabic, Rubik. Licenses and measured glyph coverage: `public/fonts/COVERAGE.md`.
* **Administrator controls (Theme Settings):** organization default theme (+ fallback), default fonts (interface = the existing *Font* field, plus headings/tables/forms), *Allow Users to Switch Themes*, *Allow Users to Customize Fonts*, *Allow Users to Choose Wallpaper*, and *Available Themes* (empty = all). System Managers can always use every theme and option. A user's saved theme/fonts are ignored (organization default used) when the administrator disables the option or removes the theme.
* **Security:** the only write path is `set_user_preference` / `reset_my_preferences`; there is no `user` argument, so a caller can only change their own row. Theme, mode, wallpaper and font identifiers are validated against fixed lists, and the administrator's rules are enforced server-side. The DocType itself is System-Manager-only (plus a `has_permission` / query-condition guard), so REST/`frappe.client` cannot reach other users' rows.
* **Login page:** guests always get the organization default theme and mode (server-rendered into the page head, so there is no flash). Signed-in website pages use the user's own theme.

## v1.6 - "Theme" for users, Studio for admins
* Users see a plain **Theme** entry (Arabic: الثيم) in the desktop launcher's avatar menu, right after *Toggle Theme* (added through Frappe's own `desktop_screen` / `add_menu_item()` contract), and in the sidebar/dock user menu. It opens a **Theme & Fonts** dialog with two tabs: *Themes* (cards with preview, name, palette, Preview, Apply, Reset to Default) and *Fonts* (four roles with live Arabic previews, Reset fonts). The Fonts tab is hidden when the administrator disables font customization. Users never see the Studio, wallpaper presets or settings links.
* **Theme Studio** (`/desk/theme-gallery`: themes, wallpaper presets and the Font Manager) is now System Manager only (reached from Theme Settings -> *Open Theme Studio*). The per-user font preferences and their server rules from v1.5 are unchanged.
* The "Theme Studio" Navbar Settings entry was removed (it was synced from the app hook, so migrate deletes it).
* The theme cards are one shared module (`public/js/theme_ui.js`) used by both the dialog and the Studio page.

## v1.7 - Login Designer (six designs)
* **Designs:** Ocean Breeze, Sunset Fusion, Forest Harmony, Royal Indigo, Modern Teal, Carbon Pro - a split-screen page (photo/gradient visual panel with logo, headline, optional feature cards, decorative shapes + a glass login card). Pure presentation: Frappe's own forms, `login.js`, CSRF, MFA/OTP, password reset, email-link and social/SSO flows are untouched and keep working inside the card.
* **Theme Settings -> Login Designer:** *Login Design* (`Match Organization Theme` [default], any of the six, `Classic (Theme Login)` = the previous look, `Native Frappe Login`), background image, logo, headline/sub-headline in English and Arabic, overlay opacity, glass transparency, card position (Start/Center/End - mirrors in Arabic), card corners, show/hide feature cards (+ up to 3 custom cards with icon, English and Arabic text), card/button colour. **Live preview** (device + language switcher) shows unsaved values; nothing is stored until you save.
* **Match Organization Theme:** if the organization default theme is one of the six it gets that login design; the original five keep the Classic login, so existing sites look exactly as before until an administrator chooses otherwise.
* **Safety:** `Native Frappe Login` (or `/login?native=1`, handy if something is ever misconfigured) serves the untouched Frappe page. Any runtime error removes the added panel and leaves the native form usable. The login page only ever uses organization-level settings - never a user's preferences; after sign-in the desk applies the user's own theme.
* **Validation:** background (jpg/png/webp, 5 MB) and logo (jpg/png/webp/svg, 1 MB) type and size are checked on save; private uploads are published (the login page is public); colours must be plain hex/rgb(a); texts are length-limited and rendered with `textContent`. No password or secret is ever read or stored.
* **Language switcher:** English/Arabic buttons set Frappe's `preferred_language` cookie (and `_lang`) - shown only for languages enabled on the site. Native "remember me" does not exist in Frappe v16, so none is offered. Missing Arabic strings of the native login ("Sign In", welcome line, "Forgot password?", reset-link message) are supplied in `translations/ar.csv`.
* Images are local (`public/wallpapers`); Modern Teal's login photo is derived from the Carbon Pro photo (mirrored, re-cropped, teal-graded).

## v1.8 - login follows the theme, Arabic by default
* **All 11 themes have a login design**, so *Login Design = Match Organization Theme* always gives the login page of the organization default theme (the original five previously fell back to the Classic login; Classic is still selectable).
* **Login Page Language** (Theme Settings -> Login Designer): Arabic (default), English or Browser Default. It only applies to visitors who have not chosen a language: `?_lang=` and the `preferred_language` cookie (set by the page's language switcher) always win. Implemented with a `before_request` hook limited to `/login` for guests.
* **Login follows the theme a person chose:** with *Match Organization Theme* and *Login Follows Last Theme Used in This Browser* (default on), a browser that has used the desk remembers the *name* of the theme in a cookie (`uts_login_theme`, validated against the fixed theme list) and the login page shows that theme's design; new browsers see the organization theme. No user data or preferences are read before sign-in. Note: choosing a specific design in *Login Design* pins the login page and stops it following themes.

## v1.9 - Print Format Studio
* **Six print designs** - Classic Gold, Modern Blue, Elegant Teal, Purple Wave, Executive Document, Creative Corporate - each with its own header/footer, palette, table style, typography, borders/decoration, totals and signature blocks. Branding is generic (company name/logo/address/tax id come from the document's Company; nothing is hardcoded).
* **Supported DocTypes:** Sales Invoice, Purchase Invoice, Quotation, Purchase Order, Sales Order, Delivery Note, Payment Entry, Journal Entry. Other apps can add more with the `uts_print_doctypes` hook (same registry shape as `print_studio/config.py::SUPPORTED`).
* **How it plugs in:** for each DocType a normal Jinja Print Format called `Print Studio - <DocType>` is created (`{{ uts_print(doc) }}`). Existing Print Formats and standard templates are never modified. *Use as default print format* sets Frappe's own `default_print_format` Property Setter and remembers/restores the previous default.
* **Print Designer Settings** (Single): default design, language mode (Arabic / English / bilingual), paper A4/Letter, orientation, margins, primary/secondary colours, font (the 8 bundled Arabic fonts, TTF copies in `public/fonts/print`) and size, table style, decorative patterns, ink-saving mode, logo, header/footer text, QR (document URL / name / amount) and signature boxes with labels, per-DocType design assignment, and a live preview that uses the unsaved form values.
* **Theme Studio -> Print Formats tab** (System Manager only): gallery of the six designs, preview with a real document of the chosen DocType (language + ink saving switchable), *Use this design for <DocType>*, *Set as organization default*, per-DocType table, Print and PDF buttons. Independent of the UI theme.
* **Data integrity:** every number is `Document.get_formatted()` of the stored value (no recalculation); taxes, discounts, currency, in-words, payment schedule and notes come from the document. Rich text goes through `sanitize_html`; colours must be `#RRGGBB`; the logo must be a local png/jpg/webp/svg <= 1 MB; no endpoint takes HTML or CSS. Preview/print respect document print permission; settings and assignments are System Manager only.
* **PDF engine notes (wkhtmltopdf 0.12.6, unpatched Qt as installed here):** it overlaps Latin text inside Arabic lines when `text-rendering: optimizeLegibility` (set by Frappe's print CSS) is active - the designs reset it - and neither repeats `<thead>` nor keeps rows whole at page breaks. The item table is therefore split by the app into per-page chunks (`print_studio/paginate.py`, conservative estimate) each with its own header, so every page has the table header, rows are never cut, and totals/signatures stay together. Engines that support these natively render the same markup. Fonts are loaded from `/assets` (absolute URL only when producing a PDF).
* Letterhead is ignored by these formats (the design draws its own header); pass `no_letterhead=1` as the buttons do.

### v1.9.1 - designs in the print view's Style list
* The six designs are also **Print Styles** (created by patch `v1_9.print_styles_and_arabic`), so they appear in the print view sidebar under *Style*. Picking one while the *Standard* format is selected switches to `Print Studio - <DocType>` and applies that design; with a Print Studio format selected the list shows only the six designs. Implemented in `public/js/print_studio.js` by wrapping the print view class (no core edits); the server maps the `style` parameter to the design.
* **Default print language is now Arabic** (Print Designer Settings -> Language; existing "Auto" value migrated). Auto / English / Bilingual remain selectable.

### v1.9.2 - Business Classic design
* Seventh print design, **Business Classic** (كلاسيكي أعمال): logo and company block on opposite sides, a thin muted-blue rule, large "Invoice <number>" title with the date row, the party block opposite, a ruled table with a grey header and a shaded amount column, a boxed totals block with a muted-blue grand-total row, plain signature lines and a thin footer. Palette: soft slate blue `#4f6d8f` with grey `#9aa8b8` (changeable in Print Designer Settings). No per-line tax column; taxes appear in the totals as with every design. Available in the gallery, the settings, the per-DocType assignment and the print view's Style list.

### v1.9.3 - three more layouts (Info Card, Full Band, Number Tile)
* **Info Card / بطاقة المعلومات** (indigo): logo and company on opposite sides, a grey panel with the party on one side and a framed card (title, number, dates) on the other. **Full Band / الشريط الكامل** (coral): centred logo, grey panel (party + company), then a full-width coloured band with the title, number and all document fields side by side. **Number Tile / المربع المميز** (orange): logo opposite a solid tile holding the document number, company and party between thin rules, then the coloured field band.
* All three share a clean ruled table with a coloured header, plain-line totals and, for Sales/Purchase Invoices, a **Payment history** table (submitted Payment Entries against the invoice: date, method, reference, allocated amount - shown only when the user may read Payment Entry and payments exist). Colours remain editable in Print Designer Settings; Arabic mirrors the layout. Ten designs in total.
* Layout ideas only: no third-party logo, images or code were used.

## v1.9.5 - Oracle-style printing for accounting and financial reports
* **Scope:** every Script/Query Report of the **Accounts** module (52 reports in this install: General Ledger, Trial Balance, Balance Sheet, Profit and Loss Statement, Cash Flow, Accounts Receivable/Payable, registers, ledgers, ratios, ...). Print Designer Settings -> *Financial Report Printing* can also extend it to all reports (*Apply to all script/query reports*) or switch it off. A report where the user picks a custom **Print Format** keeps that format untouched.
* **Styles:** *Oracle Classic* (white, black, light grey) and *Oracle Modern* (white, grey, subtle dark-red accents); *Standard (Frappe)* restores the stock output per print. Tajawal or Cairo (bundled TTFs), Arabic RTL or English LTR (Report Language: follow interface / Arabic / English), A4 or A3, portrait or landscape.
* **Layout:** company logo/name/tax id/address (or the chosen Letter Head), report title, **financial period** derived from the report's own filters, currency, an *Report parameters* grid with every applied filter, a ruled table with a repeated header on each page, bold group rows, shaded/double-ruled total row, optional row numbers, and a footer with **Printed by**, **print date** and **page x of y**.
* **How:** the report is still rendered in the browser from the data the user's own report run returned. `public/js/report_print.js` registers a second print template and wraps `QueryReport.get_print_template` / `print_report` / `pdf_report` and the print dialog (no core file changes). Each cell uses the same formatter expression as the stock `print_grid` template (same columns, order, totals, number formats), so printed values equal the on-screen report. Server side (`print_studio/report_api.py`): organization defaults, the user's own preference (`Report Print Preference`, name = user, written only through `save_preference`, values validated against fixed lists) and the company block (only what the user may read). Permissions are those of the report itself.
* **Users:** the print dialog gets *Report Style, Page Size, Font, Show row numbers* and *Remember my choices*; the administrator can disable personal preferences. Print Designer Settings shows a live preview with a sample trial balance.
* **PDF notes (wkhtmltopdf, unpatched Qt):** it cannot repeat table headers/footers or keep rows whole, and does not wrap Arabic text inside tables, so for PDF the rows are split into estimated page chunks (each with its own header and footer carrying the page number), Arabic-only cells are wrapped by the renderer, and Latin runs next to Arabic are isolated. In browser print the native repeated header and `@page` numbering are used.
