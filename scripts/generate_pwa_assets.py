from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
BG = (8, 8, 8, 255)
WHITE = (244, 244, 241, 255)
MINT = (143, 232, 207, 255)


def font(size):
    for path in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf'):
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def draw_mark(draw, cx, cy, radius):
    # Five-pointed Stellar diamond/star mark matching favicon.svg.
    outer = radius
    inner = radius * 0.34
    points = []
    for i in range(8):
        angle = -90 + i * 45
        r = outer if i % 2 == 0 else inner
        import math
        points.append((cx + r * math.cos(math.radians(angle)), cy + r * math.sin(math.radians(angle))))
    draw.polygon(points, fill=WHITE)
    draw.ellipse((cx - radius * 0.18, cy - radius * 0.18, cx + radius * 0.18, cy + radius * 0.18), fill=BG)


def make_icon(size):
    scale = 4
    image = Image.new('RGBA', (size * scale, size * scale), BG)
    draw = ImageDraw.Draw(image)
    draw_mark(draw, size * scale / 2, size * scale / 2, size * scale * 0.30)
    image.resize((size, size), Image.Resampling.LANCZOS).convert('RGB').save(ROOT / f'icon-{size}.png', optimize=True)


def make_splash(name, width, height):
    scale = 2
    image = Image.new('RGBA', (width * scale, height * scale), BG)
    draw = ImageDraw.Draw(image)
    cx, cy = width * scale / 2, height * scale / 2
    draw_mark(draw, cx, cy - height * scale * 0.035, min(width, height) * scale * 0.075)
    label = 'STELLAR AI'
    f = font(max(22, int(min(width, height) * scale * 0.020)))
    box = draw.textbbox((0, 0), label, font=f)
    draw.text((cx - (box[2] - box[0]) / 2, cy + height * scale * 0.045), label, font=f, fill=WHITE)
    image.resize((width, height), Image.Resampling.LANCZOS).convert('RGB').save(ROOT / f'{name}.png', optimize=True)


for size in (57, 72, 76, 114, 120, 144, 152, 180, 192, 512):
    make_icon(size)
make_splash('splash-iphone', 1290, 2796)
make_splash('splash-iphone-landscape', 2796, 1290)
make_splash('splash-ipad', 2048, 2732)
make_splash('splash-ipad-landscape', 2732, 2048)
print('Generated PWA assets.')
