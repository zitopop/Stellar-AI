import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'manifest.json').read_text(encoding='utf-8'))
vercel = json.loads((ROOT / 'vercel.json').read_text(encoding='utf-8'))
required = [57, 72, 76, 114, 120, 144, 152, 180, 192, 512]
manifest_sizes = sorted(int(item['sizes'].split('x')[0]) for item in manifest['icons'] if item.get('purpose') == 'any')
assert manifest_sizes == required, (manifest_sizes, required)
assert manifest['theme_color'] == '#080808'
assert manifest['background_color'] == '#080808'
assert manifest['display'] == 'standalone'
assert manifest['start_url'].startswith('/app')
assert any(rule.get('source') == '/manifest.json' for rule in vercel['headers'])
for size in required:
    path = ROOT / f'icon-{size}.png'
    assert path.exists(), path
    with Image.open(path) as image:
        assert image.size == (size, size), (path, image.size)
for name, size in [('splash-iphone.png', (1290, 2796)), ('splash-iphone-landscape.png', (2796, 1290)), ('splash-ipad.png', (2048, 2732)), ('splash-ipad-landscape.png', (2732, 2048))]:
    with Image.open(ROOT / name) as image:
        assert image.size == size, (name, image.size)
html_files = sorted(ROOT.glob('*.html'))
required_tokens = [
    'name="theme-color" content="#080808"',
    'name="mobile-web-app-capable" content="yes"',
    'name="apple-mobile-web-app-capable" content="yes"',
    'name="apple-mobile-web-app-status-bar-style" content="black-translucent"',
    'name="apple-mobile-web-app-title" content="Stellar AI"',
    'rel="manifest" href="/manifest.json"',
    'rel="apple-touch-icon" sizes="180x180" href="/icon-180.png"',
    'rel="apple-touch-startup-image"',
    'splash-iphone-landscape.png',
    'splash-ipad-landscape.png',
]
for path in html_files:
    text = path.read_text(encoding='utf-8')
    for token in required_tokens:
        assert token in text, f'{path.name}: missing {token}'
    for size in required:
        assert f'rel="apple-touch-icon" sizes="{size}x{size}" href="/icon-{size}.png"' in text, f'{path.name}: missing {size}'
print(json.dumps({
    'html_pages': len(html_files),
    'manifest_any_icon_sizes': manifest_sizes,
    'manifest_display': manifest['display'],
    'theme_color': manifest['theme_color'],
    'vercel_manifest_header': True,
    'icon_files': len(required),
    'splash_files': 4,
}, indent=2))
