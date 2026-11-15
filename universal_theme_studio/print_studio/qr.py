"""Dependency-light QR code: an inline SVG built from pyqrcode's module matrix (already installed with Frappe)."""

import pyqrcode


def qr_svg(data: str, px: int = 84) -> str:
	if not data:
		return ""
	code = pyqrcode.create(data[:300], error="M").code  # matrix of 0/1 rows
	n, border = len(code), 2
	path = []
	for y, row in enumerate(code):
		x = 0
		while x < n:
			if row[x]:
				start = x
				while x < n and row[x]:
					x += 1
				path.append(f"M{start + border} {y + border}h{x - start}v1h-{x - start}z")
			else:
				x += 1
	size = n + 2 * border
	return (
		f'<svg xmlns="http://www.w3.org/2000/svg" width="{px}" height="{px}" viewBox="0 0 {size} {size}" '
		f'shape-rendering="crispEdges"><rect width="{size}" height="{size}" fill="#fff"/>'
		f'<path d="{"".join(path)}" fill="#000"/></svg>'
	)
