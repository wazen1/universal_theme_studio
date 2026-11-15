"""Print CSS for the six designs.

Written for wkhtmltopdf 0.12 (old WebKit) as well as browsers: no CSS variables, flexbox or grid; table layouts,
-webkit- gradient syntax next to the standard one, TTF fonts. Colours are injected by the server (tokens @X@)."""

from universal_theme_studio.print_studio import config as C


def _rgb(h):
	h = h.lstrip("#")
	return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def mix(h, other="#ffffff", t=0.9):
	"""`t` of `other` mixed into `h` (t=0.9 on white = a very light tint)."""
	a, b = _rgb(h), _rgb(other)
	return "#%02x%02x%02x" % tuple(round(a[i] * (1 - t) + b[i] * t) for i in range(3))


def rgba(h, a):
	r, g, b = _rgb(h)
	return f"rgba({r},{g},{b},{a})"


def grad(a, b, to="right"):
	wk = {"right": "left", "bottom": "top"}[to]
	return f"background:{a};background:-webkit-linear-gradient({wk},{a},{b});background:linear-gradient(to {to},{a},{b});"


BASE = """
@font-face{font-family:"@FF@";src:  url(@FB@/assets/universal_theme_studio/fonts/print/@FS@-regular.ttf) format("truetype");font-weight:400;font-style:normal}
@font-face{font-family:"@FF@";src:  url(@FB@/assets/universal_theme_studio/fonts/print/@FS@-bold.ttf) format("truetype");font-weight:700;font-style:normal}
@page{size:@PAPER@ @ORIENT@;margin:@M@mm}
.print-format{margin-top:@M@mm;margin-bottom:@M@mm;margin-left:@M@mm;margin-right:@M@mm;page-size:@PAPER@;orientation:@ORIENT@}
.uts-doc{font-family:"@FF@",Arial,Tahoma,sans-serif;font-size:@SZ@pt;color:#1f2937;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.uts-doc,.uts-doc *{box-sizing:border-box;letter-spacing:0;text-rendering:auto}
.uts-doc table{border-collapse:collapse;border-spacing:0;width:100%}
.uts-doc td,.uts-doc th{vertical-align:top;padding:0}
.uts-doc.rtl{direction:rtl;text-align:right}
.uts-doc.ltr{direction:ltr;text-align:left}
.uts-doc .num{direction:ltr;unicode-bidi:embed;display:inline-block;white-space:nowrap}
.uts-doc.ltr .c-num{text-align:right}.uts-doc.rtl .c-num{text-align:left}
.uts-doc.ltr .c-end{text-align:right}.uts-doc.rtl .c-end{text-align:left}
.uts-doc .b-ar{display:block}.uts-doc .b-en{display:block;font-size:.82em;opacity:.85}
.uts-doc.m-both .meta .b-en,.uts-doc.m-both .meta .b-ar,.uts-doc.m-both .party-l .b-en,.uts-doc.m-both .party-l .b-ar{display:inline}
.uts-doc.m-both .meta .b-en:after{content:" / "}
.uts-doc .logo{max-height:64px;max-width:190px;margin-bottom:4px}
.uts-doc .co-name{font-size:1.45em;font-weight:700;line-height:1.25}
.uts-doc .co-meta{font-size:.84em;line-height:1.55}
.uts-doc .doc-title{font-size:1.7em;font-weight:700;line-height:1.2}
.uts-doc .doc-no{font-size:1.05em;font-weight:700;margin-top:3px}
.uts-doc .info{margin:14px 0 4px}
.uts-doc .info td.col{width:50%}
.uts-doc .party-l{font-size:.8em;font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px}
.uts-doc.rtl .party-l,.uts-doc.m-ar .party-l{letter-spacing:0;text-transform:none}
.uts-doc .party-n{font-size:1.15em;font-weight:700;margin-bottom:2px}
.uts-doc .party-a{font-size:.9em;line-height:1.5}
.uts-doc .meta td{padding:2px 0;font-size:.92em}
.uts-doc .meta td.k{color:#6b7280;width:42%}
.uts-doc.ltr .meta td.k{padding-right:8px}.uts-doc.rtl .meta td.k{padding-left:8px}
.uts-doc .meta td.v{font-weight:700}
.uts-doc table.items{margin:12px 0;table-layout:fixed;width:100%}
.uts-doc table.items td .num,.uts-doc table.items td.c-num{white-space:normal}
.uts-doc table.items td.c-num .num{display:inline-block;direction:ltr}
.uts-doc .chunk.brk{page-break-before:always}
.uts-doc table.items thead{display:table-header-group}
.uts-doc table.items tr{page-break-inside:avoid}
.uts-doc table.items th{padding:7px 8px;font-size:.88em;font-weight:700;text-align:inherit}
.uts-doc table.items td{padding:7px 8px;border-bottom:1px solid #e5e7eb;font-size:.95em}
.uts-doc table.items .it-n{font-weight:700}
.uts-doc table.items .it-d{font-size:.84em;color:#6b7280;margin-top:1px}
.uts-doc table.items.striped tbody tr:nth-child(even) td{background:@PL@}
.uts-doc table.items.lined td{border-bottom:1px solid @PM@}
.uts-doc table.items.bordered td,.uts-doc table.items.bordered th{border:1px solid @PM@}
.uts-doc table.items.minimal td{border-bottom:0}
.uts-doc table.items.minimal tbody tr:last-child td{border-bottom:1px solid @PM@}
.uts-doc table.bottom{margin-top:6px;page-break-inside:avoid}
.uts-doc table.bottom td.nt{width:56%}
.uts-doc.ltr table.bottom td.nt{padding-right:16px}.uts-doc.rtl table.bottom td.nt{padding-left:16px}
.uts-doc table.bottom td.tt{width:44%}
.uts-doc .notes-b{margin-bottom:9px;font-size:.88em;line-height:1.55;page-break-inside:avoid}
.uts-doc .notes-h{font-weight:700;font-size:.82em;text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px;color:@P@}
.uts-doc.rtl .notes-h,.uts-doc.m-ar .notes-h{letter-spacing:0;text-transform:none}
.uts-doc .inwords{font-style:italic}
.uts-doc table.sched td,.uts-doc table.sched th{padding:2px 6px;font-size:.88em;border-bottom:1px solid #e5e7eb}
.uts-doc table.totals td{padding:5px 9px;font-size:.95em}
.uts-doc table.totals tr.grand td{font-weight:700;font-size:1.08em}
.uts-doc table.sig{margin-top:28px;page-break-inside:avoid}
.uts-doc table.sig td.sg{width:33.33%;padding:0 10px;text-align:center}
.uts-doc .sg-space{height:46px}
.uts-doc .sg-l{font-size:.86em;font-weight:700;padding-top:4px}
.uts-doc .sg-l .b-en{font-weight:400}
.uts-doc .ft{margin-top:18px;font-size:.8em;line-height:1.5;page-break-inside:avoid}
.uts-doc .ft-t{white-space:pre-line}
.uts-doc .qr{line-height:0}
.uts-doc .qr-c{font-size:.65em;color:#6b7280;margin-top:3px;line-height:1.2;text-align:center}
.uts-doc .deco{line-height:0;font-size:0}
.uts-doc .pay-h{font-weight:700;margin:14px 0 4px;font-size:.95em}
.uts-doc table.paytbl{margin-bottom:6px;page-break-inside:avoid}
.uts-doc table.paytbl th{padding:5px 8px;font-size:.84em;text-align:inherit}
.uts-doc table.paytbl td{padding:5px 8px;font-size:.88em;border-bottom:1px solid #e5e7eb}
.uts-doc table.mband td{padding:0 6px;font-size:.84em;vertical-align:top;line-height:1.5}
.uts-doc table.mband .mv{display:block;word-break:break-all}

"""

D = {}

D["classic-gold"] = """
.d-classic-gold{border:1.5px solid @P@;padding:4px}
.d-classic-gold .frame{border:.5px solid @P@;padding:16px 20px}
.d-classic-gold .hd{text-align:center;padding-bottom:10px;border-bottom:3px double @P@}
.d-classic-gold .co-name{font-size:1.7em;color:@PD@;letter-spacing:.03em}
.d-classic-gold .co-meta{color:#6b6b6b}
.d-classic-gold .doc-title{text-align:center;color:@P@;letter-spacing:.14em;text-transform:uppercase;font-size:1.35em;margin:12px 0 2px}
.d-classic-gold.rtl .doc-title,.d-classic-gold.m-ar .doc-title{letter-spacing:0}
.d-classic-gold .doc-no{text-align:center;color:@PD@}
.d-classic-gold .party-l,.d-classic-gold .notes-h{color:@P@}
.d-classic-gold .party-n{color:@PD@}
.d-classic-gold table.items th{color:@PD@;background:@PL@;border-top:1.5px solid @P@;border-bottom:1.5px solid @P@;letter-spacing:.02em}
.d-classic-gold table.items td{border-bottom:1px solid @PM@}
.d-classic-gold table.totals{border-top:2px solid @P@}
.d-classic-gold table.totals td{border-bottom:1px solid @PM@}
.d-classic-gold table.totals tr.grand td{background:@P@;color:#fff;border:0}
.d-classic-gold table.sig td.sg{border-top:0}
.d-classic-gold .sg-line{border-top:1.5px solid @P@;margin:0 14px}
.d-classic-gold .sg-l{color:@PD@;font-variant:small-caps;letter-spacing:.05em}
.d-classic-gold .ft{border-top:3px double @P@;padding-top:8px;text-align:center;color:#6b6b6b}
"""

D["modern-blue"] = """
.d-modern-blue .band{@GRAD@color:#fff;border-radius:8px;padding:16px 20px}
.d-modern-blue .band .co-name,.d-modern-blue .band .doc-title,.d-modern-blue .band .doc-no{color:#fff}
.d-modern-blue .band .co-meta{color:#e0ecff}
.d-modern-blue .band table td{vertical-align:middle}
.d-modern-blue .band .logo{background:#fff;border-radius:6px;padding:4px}
.d-modern-blue .doc-title{font-size:1.9em}
.d-modern-blue .info td.col .card{background:@PL@;border-radius:8px;padding:10px 14px;border-left:4px solid @P@}
.d-modern-blue.rtl .info td.col .card{border-left:0;border-right:4px solid @P@}
.d-modern-blue .party-l,.d-modern-blue .notes-h{color:@P@}
.d-modern-blue table.items{border-radius:8px;overflow:hidden}
.d-modern-blue table.items th{@GRAD@color:#fff;border:0}
.d-modern-blue table.items td{border-bottom:1px solid #e7ecf6}
.d-modern-blue table.totals td{border-bottom:1px solid #e7ecf6}
.d-modern-blue table.totals tr.grand td{@GRAD@color:#fff;border:0;font-size:1.15em}
.d-modern-blue table.sig td.sg .sgbox{background:@PL@;border:1px solid @PM@;border-radius:8px;padding:8px 8px 6px}
.d-modern-blue .sg-line{border-top:1.5px solid @P@;margin:0 12px}
.d-modern-blue .ft{@GRAD@color:#fff;border-radius:6px;padding:8px 14px;text-align:center}
"""

D["elegant-teal"] = """
.d-elegant-teal .hd td{vertical-align:bottom}
.d-elegant-teal .co-name{color:@P@;font-weight:700}
.d-elegant-teal .doc-title{color:@P@;font-weight:400;font-size:2.1em;letter-spacing:.02em}
.d-elegant-teal .tt-bar{border-left:5px solid @S@;padding-left:12px}
.d-elegant-teal.rtl .tt-bar{border-left:0;border-right:5px solid @S@;padding-left:0;padding-right:12px}
.d-elegant-teal .hr{border-top:1px solid @P@;margin:10px 0 0}
.d-elegant-teal .party-l,.d-elegant-teal .notes-h{color:@P@}
.d-elegant-teal .info td.col .card{padding:2px 0}
.d-elegant-teal table.items th{color:@P@;background:#fff;border-bottom:2px solid @P@;border-top:1px solid @SL@;text-transform:uppercase;letter-spacing:.03em;font-size:.8em}
.d-elegant-teal.rtl table.items th,.d-elegant-teal.m-ar table.items th{text-transform:none;letter-spacing:0}
.d-elegant-teal table.items td{border-bottom:1px solid #e8f3f1}
.d-elegant-teal table.totals td{border-bottom:1px solid #e8f3f1}
.d-elegant-teal table.totals tr.grand td{color:@P@;border-top:2px solid @P@;border-bottom:0;font-size:1.2em}
.d-elegant-teal .sg-line{border-top:1px solid @P@;margin:0 16px}
.d-elegant-teal .sg-l{color:@P@}
.d-elegant-teal .ft{border-top:1px solid @SL@;color:@P@;padding-top:7px}
"""

D["purple-wave"] = """
.d-purple-wave .band{@GRAD@color:#fff;border-radius:10px 10px 0 0;padding:18px 22px 10px}
.d-purple-wave .band .co-name,.d-purple-wave .band .doc-title,.d-purple-wave .band .doc-no{color:#fff}
.d-purple-wave .band .co-meta{color:#efe3ff}
.d-purple-wave .band td{vertical-align:middle}
.d-purple-wave .band .logo{background:#fff;border-radius:8px;padding:4px}
.d-purple-wave .wave-top{line-height:0;font-size:0;margin-top:-1px}
.d-purple-wave .doc-title{font-size:1.85em}
.d-purple-wave .info td.col .card{background:@PL@;border-radius:14px;padding:10px 14px}
.d-purple-wave .party-l,.d-purple-wave .notes-h{color:@P@}
.d-purple-wave table.items th{@GRAD@color:#fff;border:0}
.d-purple-wave table.items td{border-bottom:1px solid #eee6fa}
.d-purple-wave table.totals{background:@PL@;border-radius:14px}
.d-purple-wave table.totals td{border-bottom:1px solid #e6daf7}
.d-purple-wave table.totals tr.grand td{@GRAD@color:#fff;border:0;font-size:1.15em}
.d-purple-wave table.sig td.sg .sgbox{border:1.5px solid @PM@;border-radius:14px;padding:8px}
.d-purple-wave .sg-line{border-top:1.5px dashed @P@;margin:0 12px}
.d-purple-wave .wave-bot{line-height:0;font-size:0;margin-top:14px}
.d-purple-wave .ft{text-align:center;color:@P@;padding:2px 0 0}
"""

D["executive-document"] = """
.d-executive-document .top-rule{border-top:5px solid @P@;border-bottom:1px solid @P@;height:7px;margin-bottom:12px}
.d-executive-document .hd td{vertical-align:top}
.d-executive-document .co-name{color:@P@;text-transform:uppercase;letter-spacing:.06em;font-family:"@FF@",Georgia,"Times New Roman",serif}
.d-executive-document.rtl .co-name,.d-executive-document.m-ar .co-name{letter-spacing:0}
.d-executive-document .doc-title{color:@P@;text-transform:uppercase;letter-spacing:.08em;font-size:1.55em}
.d-executive-document.ltr .doc-title,.d-executive-document.ltr .noboxwrap{text-align:right}.d-executive-document.rtl .doc-title,.d-executive-document.rtl .noboxwrap{text-align:left}
.d-executive-document.rtl .doc-title,.d-executive-document.m-ar .doc-title{letter-spacing:0}
.d-executive-document .no-box{display:inline-block;border:1.5px solid @P@;padding:3px 12px;margin-top:5px;font-weight:700;color:@P@}
.d-executive-document .pat{position:absolute;top:0;right:0;line-height:0}
.d-executive-document.rtl .pat{right:auto;left:0}
.d-executive-document .info{border:1px solid @PM@}
.d-executive-document .info td.col{padding:8px 12px}
.d-executive-document .info td.col+td.col{border-left:1px solid @PM@}
.d-executive-document.rtl .info td.col+td.col{border-left:0;border-right:1px solid @PM@}
.d-executive-document .party-l,.d-executive-document .notes-h{color:@P@}
.d-executive-document table.items{border:1px solid @P@}
.d-executive-document table.items th{background:@P@;color:#fff;border:1px solid @P@;text-transform:uppercase;letter-spacing:.03em;font-size:.8em}
.d-executive-document.rtl table.items th,.d-executive-document.m-ar table.items th{text-transform:none;letter-spacing:0}
.d-executive-document table.items td{border:1px solid @PM@}
.d-executive-document table.totals{border:1px solid @P@}
.d-executive-document table.totals td{border:1px solid @PM@}
.d-executive-document table.totals td.lb{background:@PL@}
.d-executive-document table.totals tr.grand td{background:@P@;color:#fff;border:1px solid @P@}
.d-executive-document table.sig td.sg .sgbox{border:1px solid @P@;padding:6px 8px 4px}
.d-executive-document .sg-line{border-top:1px solid @P@;margin:0 10px}
.d-executive-document .stamp{font-size:.7em;color:#9ca3af;text-align:center;margin-top:2px}
.d-executive-document .ft{border-top:1px solid @P@;padding-top:6px;text-align:center;color:#4b5563}
"""

D["creative-corporate"] = """
.d-creative-corporate .hd td{vertical-align:middle}
.d-creative-corporate .hd .lft{@GRAD@color:#fff;padding:14px 18px;border-radius:10px 0 0 10px}
.d-creative-corporate.rtl .hd .lft{border-radius:0 10px 10px 0}
.d-creative-corporate .hd .lft .co-name{color:#fff}
.d-creative-corporate .hd .lft .co-meta{color:#d9f3ef}
.d-creative-corporate .hd .lft .logo{background:#fff;border-radius:6px;padding:4px}
.d-creative-corporate .hd .rgt{background:@S@;color:#fff;padding:14px 18px;border-radius:0 10px 10px 0;width:36%;text-align:center}
.d-creative-corporate.rtl .hd .rgt{border-radius:10px 0 0 10px}
.d-creative-corporate .hd .rgt .doc-title,.d-creative-corporate .hd .rgt .doc-no{color:#fff}
.d-creative-corporate .cards td.col{padding:0 5px}
.d-creative-corporate .cards td.col:first-child{padding-left:0}
.d-creative-corporate .cards td.col:last-child{padding-right:0}
.d-creative-corporate.rtl .cards td.col:first-child{padding-left:5px;padding-right:0}
.d-creative-corporate.rtl .cards td.col:last-child{padding-right:5px;padding-left:0}
.d-creative-corporate .cards .card{border:1px solid @PM@;border-top:4px solid @S@;border-radius:8px;padding:10px 12px;background:#fff}
.d-creative-corporate .party-l,.d-creative-corporate .notes-h{color:@P@}
.d-creative-corporate table.items th{background:@P@;color:#fff;border-bottom:3px solid @S@}
.d-creative-corporate table.items td{border-bottom:1px solid @PM@}
.d-creative-corporate table.totals{border:1px solid @PM@;border-top:4px solid @S@;border-radius:8px}
.d-creative-corporate table.totals td{border-bottom:1px solid @PL@}
.d-creative-corporate table.totals tr.grand td{background:@P@;color:#fff;border:0}
.d-creative-corporate table.totals tr.grand td.val{background:@S@}
.d-creative-corporate table.sig td.sg .sgbox{border:1px solid @PM@;border-top:4px solid @P@;border-radius:8px;padding:8px}
.d-creative-corporate .sg-line{border-top:1px solid @S@;margin:0 10px}
.d-creative-corporate .ft{background:@P@;color:#fff;border-bottom:3px solid @S@;border-radius:6px;padding:8px 14px;text-align:center}
"""

D["business-classic"] = """
.d-business-classic .hd td.lg{width:40%}
.d-business-classic .hd td.co{width:60%;color:#374151}
.d-business-classic.ltr .hd td.co{text-align:right}.d-business-classic.rtl .hd td.co{text-align:left}
.d-business-classic .co-name{color:@P@;font-size:1.25em}
.d-business-classic .rule{border-top:2px solid @P@;margin:10px 0 14px}
.d-business-classic table.ttl td{vertical-align:bottom}
.d-business-classic table.ttl td.tl{width:62%}
.d-business-classic table.ttl td.tr{width:38%;font-size:.92em;color:#374151}
.d-business-classic.ltr table.ttl td.tr{text-align:right}.d-business-classic.rtl table.ttl td.tr{text-align:left}
.d-business-classic .doc-title{color:@P@;font-weight:500;font-size:1.65em}
.d-business-classic .doc-title .st{font-size:.5em;color:#6b7280}
.d-business-classic .dts{margin-top:10px;font-size:.86em;line-height:1.45}
.d-business-classic .mi{display:inline-block;vertical-align:top;min-width:92px;max-width:170px;margin-bottom:8px}
.d-business-classic.ltr .mi{margin-right:24px}.d-business-classic.rtl .mi{margin-left:24px}
.d-business-classic .mk{display:block;font-weight:700;color:@PD@;margin-bottom:2px}
.d-business-classic .mv{display:block;word-break:break-all}
.d-business-classic .party-l{color:@P@;margin-bottom:1px}
.d-business-classic .party-n{font-size:1.05em}
.d-business-classic table.items{margin-top:16px;border:1px solid #374151}
.d-business-classic table.items th{background:#e7eaee;color:@PD@;border:1px solid #374151;padding:6px 8px;font-size:.84em}
.d-business-classic table.items td{border:1px solid #374151;padding:6px 8px}
.d-business-classic table.items td:last-child{background:#f1f3f5}
.d-business-classic table.items th:last-child{background:#d6dbe1}
.d-business-classic table.totals{border:1px solid #374151}
.d-business-classic table.totals td{border:1px solid #374151}
.d-business-classic table.totals td.lb{background:#e7eaee}
.d-business-classic table.totals tr.grand td{background:@P@;color:#fff;border:1px solid @P@}
.d-business-classic table.sig{margin-top:30px}
.d-business-classic .sg-line{border-top:1px solid #374151}
.d-business-classic .ft{border-top:1px solid #d1d5db;padding-top:6px;text-align:center;color:#6b7280}
"""

D["info-card"] = """
.d-info-card table.panel td.pl{width:55%;vertical-align:top}
.d-info-card table.panel td.pr{width:45%;vertical-align:top}
.d-info-card.ltr .hd td.co,.d-info-card.ltr .hd td.tile-c{text-align:right}.d-info-card.rtl .hd td.co,.d-info-card.rtl .hd td.tile-c{text-align:left}
.d-info-card .hd td.lg{width:45%}
.d-info-card .co-name{font-size:1.2em}
.d-info-card .co-meta{color:#4b5563}
.d-info-card table.items{border:0;margin-top:14px}
.d-info-card table.items th{background:@P@;color:#fff;border:0;padding:6px 8px;font-size:.84em}
.d-info-card table.items td{border-bottom:1px solid #e5e7eb;padding:6px 8px}
.d-info-card table.items tbody tr:nth-child(even) td{background:#eceef1}
.d-info-card table.totals{border:0}
.d-info-card table.totals td{border-bottom:1px solid #374151;padding:4px 2px;background:none}
.d-info-card table.totals tr.grand td{border:0;border-top:2px solid #111827;background:none;color:#111827;font-size:1.12em}
.d-info-card table.paytbl th{background:@P@;color:#fff}
.d-info-card table.paytbl tbody tr:nth-child(even) td{background:#eceef1}
.d-info-card .party-l{color:@P@;font-size:.92em}
.d-info-card .sg-line{border-top:1px solid #374151}
.d-info-card .ft{border-top:1px solid #374151;padding-top:6px;text-align:center;color:#374151}

.d-info-card table.hd{margin-bottom:10px}
.d-info-card table.panel{background:#eef0f3;border-top:2px solid @P@;border-bottom:2px solid @P@;margin:6px 0 4px}
.d-info-card table.panel td.pl{padding:12px 14px}
.d-info-card table.panel td.pr{padding:12px 14px}
.d-info-card .icard{border:1px solid @P@;background:#fff}
.d-info-card .ic-h{background:@P@;color:#fff;padding:5px 9px}
.d-info-card .ic-h span{display:block;font-size:.8em}
.d-info-card .ic-h b{font-size:1.05em}
.d-info-card .icard table.meta{width:100%;margin:4px 0}
.d-info-card .icard .meta td{padding:2px 9px;font-size:.88em}
.d-info-card .icard .meta td.k{font-weight:700}
.d-info-card.ltr .icard .meta td.v{text-align:right}.d-info-card.rtl .icard .meta td.v{text-align:left}
.d-info-card .ic-st{padding:2px 9px 5px;font-size:.82em;color:@P@;font-weight:700}
"""

D["full-band"] = """
.d-full-band table.panel td.pl{width:55%;vertical-align:top}
.d-full-band table.panel td.pr{width:45%;vertical-align:top}
.d-full-band.ltr .hd td.co,.d-full-band.ltr .hd td.tile-c{text-align:right}.d-full-band.rtl .hd td.co,.d-full-band.rtl .hd td.tile-c{text-align:left}
.d-full-band .hd td.lg{width:45%}
.d-full-band .co-name{font-size:1.2em}
.d-full-band .co-meta{color:#4b5563}
.d-full-band table.items{border:0;margin-top:14px}
.d-full-band table.items th{background:@P@;color:#fff;border:0;padding:6px 8px;font-size:.84em}
.d-full-band table.items td{border-bottom:1px solid #e5e7eb;padding:6px 8px}
.d-full-band table.items tbody tr:nth-child(even) td{background:#eceef1}
.d-full-band table.totals{border:0}
.d-full-band table.totals td{border-bottom:1px solid #374151;padding:4px 2px;background:none}
.d-full-band table.totals tr.grand td{border:0;border-top:2px solid #111827;background:none;color:#111827;font-size:1.12em}
.d-full-band table.paytbl th{background:@P@;color:#fff}
.d-full-band table.paytbl tbody tr:nth-child(even) td{background:#eceef1}
.d-full-band .party-l{color:@P@;font-size:.92em}
.d-full-band .sg-line{border-top:1px solid #374151}
.d-full-band .ft{border-top:1px solid #374151;padding-top:6px;text-align:center;color:#374151}

.d-full-band .lgc{text-align:center;margin-bottom:8px}
.d-full-band table.panel{background:#eef0f3;border-top:2px solid @P@;margin-top:4px}
.d-full-band table.panel td.pl,.d-full-band table.panel td.pr{padding:12px 14px}
.d-full-band.ltr table.panel td.pr{text-align:right}.d-full-band.rtl table.panel td.pr{text-align:left}
.d-full-band .band2{background:@P@;color:#fff;padding:9px 10px;margin:12px 0 4px}
.d-full-band .band2 .doc-title{font-size:1.25em;margin-bottom:6px}
.d-full-band .band2 .doc-title .st{font-size:.6em;font-weight:400}
.d-full-band .band2 table.mband td{color:#fff}
"""

D["number-tile"] = """
.d-number-tile table.panel td.pl{width:55%;vertical-align:top}
.d-number-tile table.panel td.pr{width:45%;vertical-align:top}
.d-number-tile.ltr .hd td.co,.d-number-tile.ltr .hd td.tile-c{text-align:right}.d-number-tile.rtl .hd td.co,.d-number-tile.rtl .hd td.tile-c{text-align:left}
.d-number-tile .hd td.lg{width:45%}
.d-number-tile .co-name{font-size:1.2em}
.d-number-tile .co-meta{color:#4b5563}
.d-number-tile table.items{border:0;margin-top:14px}
.d-number-tile table.items th{background:@P@;color:#fff;border:0;padding:6px 8px;font-size:.84em}
.d-number-tile table.items td{border-bottom:1px solid #e5e7eb;padding:6px 8px}
.d-number-tile table.items tbody tr:nth-child(even) td{background:#eceef1}
.d-number-tile table.totals{border:0}
.d-number-tile table.totals td{border-bottom:1px solid #374151;padding:4px 2px;background:none}
.d-number-tile table.totals tr.grand td{border:0;border-top:2px solid #111827;background:none;color:#111827;font-size:1.12em}
.d-number-tile table.paytbl th{background:@P@;color:#fff}
.d-number-tile table.paytbl tbody tr:nth-child(even) td{background:#eceef1}
.d-number-tile .party-l{color:@P@;font-size:.92em}
.d-number-tile .sg-line{border-top:1px solid #374151}
.d-number-tile .ft{border-top:1px solid #374151;padding-top:6px;text-align:center;color:#374151}

.d-number-tile .tile{display:inline-block;background:@P@;color:#fff;padding:12px 16px;min-width:150px;text-align:center}
.d-number-tile .tile .tt{font-size:.82em}
.d-number-tile .tile b{display:block;font-size:1.05em;margin:3px 0}
.d-number-tile table.two{border-top:1px solid @P@;border-bottom:1px solid @P@;margin-top:12px}
.d-number-tile table.two td{padding:10px 0}
.d-number-tile.ltr table.two td.pr{padding-left:14px}.d-number-tile.rtl table.two td.pr{padding-right:14px}
.d-number-tile table.mband{background:@P@;color:#fff;margin:12px 0 4px}
.d-number-tile table.mband td{color:#fff;padding:8px 8px}
"""

INK = """
.uts-doc.ink .band,.uts-doc.ink .hd .lft,.uts-doc.ink .hd .rgt,.uts-doc.ink .ft{background:#fff!important;color:@P@!important;border:1px solid @P@!important}
.uts-doc.ink .band *,.uts-doc.ink .hd .lft *,.uts-doc.ink .hd .rgt *,.uts-doc.ink .ft *{color:@P@!important}
.uts-doc.ink table.items th{background:@PL@!important;color:@P@!important;border-color:@PM@!important}
.uts-doc.ink table.totals tr.grand td{background:#fff!important;color:@P@!important;border:1px solid @P@!important}
.uts-doc.ink table.totals,.uts-doc.ink .info td.col .card,.uts-doc.ink .sgbox{background:#fff!important}
.uts-doc.ink table.items.striped tbody tr:nth-child(even) td{background:#fff!important}
.uts-doc.ink .deco,.uts-doc.ink .pat,.uts-doc.ink .wave-top,.uts-doc.ink .wave-bot{display:none!important}
"""


def build_css(cfg, font_base=""):
	p, s = cfg["primary"], cfg["secondary"]
	d = cfg["design"]
	tok = {
		"@FB@": font_base,
		"@FF@": cfg["font"][1],
		"@FS@": cfg["font"][0],
		"@SZ@": str(cfg["size"]),
		"@M@": str(cfg["margin"]),
		"@PAPER@": cfg["paper"],
		"@ORIENT@": cfg["orientation"].lower(),
		"@P@": p,
		"@S@": s,
		"@PL@": mix(p, "#ffffff", 0.92),
		"@PM@": mix(p, "#ffffff", 0.72),
		"@PD@": mix(p, "#000000", 0.25),
		"@SL@": mix(s, "#ffffff", 0.78),
		"@GRAD@": grad(p, s if d in ("modern-blue", "purple-wave", "creative-corporate") else mix(p, "#000000", 0.2)),
	}
	css = BASE + D[d] + INK
	for k in sorted(tok, key=len, reverse=True):
		css = css.replace(k, tok[k])
	return css
