# Bundled fonts: licenses and Arabic coverage

All fonts are distributed under the SIL Open Font License 1.1 (texts in `licenses/`), packaged from `@fontsource` 5.3.0.
Coverage was checked with fontTools against the *-arabic-400* (Arabic) and *-latin-400* (Latin) subset files.

| Font | Weights bundled | Arabic core letters (36) | Harakat (8) | Arabic-Indic digits (10) | Persian/Urdu extras (6) | Latin A-Za-z0-9 |
|---|---|---|---|---|---|---|
| Tajawal | 400/500/700 | 36/36 | 8/8 | 10/10 | 1/6 | 62/62 |
| Cairo | 400/500/700 | 36/36 | 8/8 | 10/10 | 6/6 | 62/62 |
| IBM Plex Sans Arabic | 400/500/700 | 36/36 | 8/8 | 10/10 | 6/6 | 62/62 |
| Alexandria | 400/500/700 | 36/36 | 8/8 | 10/10 | 6/6 | 62/62 |
| Readex Pro | 400/500/700 | 36/36 | 8/8 | 10/10 | 0/6 | 62/62 |
| Almarai | 400/700 | 36/36 | 8/8 | 10/10 | 6/6 | 62/62 |
| Noto Sans Arabic | 400/500/700 | 36/36 (+5 extended) | 8/8 | 10/10 | 6/6 | 62/62 |
| Rubik (Arabic subset) | 400/500/700 | 36/36 | 8/8 | 10/10 | 6/6 | 62/62 |

Notes: Tajawal has only 1 of the 6 Persian/Urdu extras and Readex Pro has none (those letters fall back to the next font in the stack); Almarai ships no 500 weight (500 renders as 400).
Lam-alef and other joins are produced by OpenType shaping, so missing legacy presentation-form code points (U+FEFB, U+FDF2 in Readex Pro/Rubik) do not affect rendering.
