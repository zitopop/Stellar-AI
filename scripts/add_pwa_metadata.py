from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
ICON_SIZES = (57, 72, 76, 114, 120, 144, 152, 180, 192, 512)


def strip_existing(head: str) -> str:
    patterns = [
        r'\s*<meta\s+name=["\']theme-color["\'][^>]*>',
        r'\s*<meta\s+name=["\']mobile-web-app-capable["\'][^>]*>',
        r'\s*<meta\s+name=["\']apple-mobile-web-app-capable["\'][^>]*>',
        r'\s*<meta\s+name=["\']apple-mobile-web-app-status-bar-style["\'][^>]*>',
        r'\s*<meta\s+name=["\']apple-mobile-web-app-title["\'][^>]*>',
        r'\s*<link\s+[^>]*rel=["\']manifest["\'][^>]*>',
        r'\s*<link\s+[^>]*rel=["\']apple-touch-icon[^>]*>',
        r'\s*<link\s+[^>]*rel=["\']apple-touch-startup-image["\'][^>]*>',
    ]
    for pattern in patterns:
        head = re.sub(pattern, '', head, flags=re.I)
    return head


icons = '\n'.join(f'  <link rel="apple-touch-icon" sizes="{size}x{size}" href="/icon-{size}.png">' for size in ICON_SIZES)
block = f'''\n  <!-- Stellar AI PWA metadata: iPhone/iPad home-screen install support -->\n  <meta name="theme-color" content="#080808">\n  <meta name="mobile-web-app-capable" content="yes">\n  <meta name="apple-mobile-web-app-capable" content="yes">\n  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n  <meta name="apple-mobile-web-app-title" content="Stellar AI">\n  <link rel="manifest" href="/manifest.json">\n{icons}\n  <link rel="apple-touch-startup-image" href="/splash-iphone.png" media="(orientation: portrait) and (max-width: 600px)">\n  <link rel="apple-touch-startup-image" href="/splash-iphone-landscape.png" media="(orientation: landscape) and (max-width: 600px)">\n  <link rel="apple-touch-startup-image" href="/splash-ipad.png" media="(orientation: portrait) and (min-width: 601px)">\n  <link rel="apple-touch-startup-image" href="/splash-ipad-landscape.png" media="(orientation: landscape) and (min-width: 601px)">\n'''

changed = []
for path in sorted(ROOT.glob('*.html')):
    text = path.read_text(encoding='utf-8')
    match = re.search(r'<head\b[^>]*>(.*?)</head\s*>', text, flags=re.I | re.S)
    if not match:
        continue
    head = strip_existing(match.group(1))
    head = block + head
    updated = text[:match.start(1)] + head + text[match.end(1):]
    if updated != text:
        path.write_text(updated, encoding='utf-8')
        changed.append(path.name)
print(f'Updated {len(changed)} HTML pages: {", ".join(changed)}')
