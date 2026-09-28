"""Give every firm logo the same size and shape, whatever was uploaded.

Uploaded logos arrive in any aspect ratio, often with empty borders, stray edge
lines from screenshots, or a white page around a dark mark. Shown in a square
tile they shrink and gain bars. normalize_logo() trims the empty border, squares
the mark by extending the logo's own background (or transparency), and saves a
fixed-size PNG, so the tile is always filled.
"""
import io
import uuid
from statistics import median

from django.core.files.base import ContentFile
from PIL import Image, ImageChops, ImageOps

LOGO_SIZE = 512
# Share of the square left around the mark, per side.
PADDING = 0.08
# Thin lines along the very edge (screenshot borders) are shaved off first.
EDGE_SHAVE = 0.01
# How far a pixel must differ from the background, per channel, to count as the mark.
COLOUR_TOLERANCE = 40
TRANSPARENT_BELOW = 16


def _border_pixels(image):
    width, height = image.size
    pixels = image.load()
    for x in range(width):
        yield pixels[x, 0]
        yield pixels[x, height - 1]
    for y in range(1, height - 1):
        yield pixels[0, y]
        yield pixels[width - 1, y]


def _background(image):
    """The logo's background: None when transparent, else its typical border colour."""
    border = list(_border_pixels(image))
    if sum(1 for pixel in border if pixel[3] < TRANSPARENT_BELOW) > len(border) / 2:
        return None
    opaque = [pixel for pixel in border if pixel[3] >= TRANSPARENT_BELOW]
    return tuple(int(median(pixel[channel] for pixel in opaque)) for channel in range(3)) + (255,)


def _content_box(image, background):
    alpha = image.getchannel("A").point(lambda value: 255 if value >= TRANSPARENT_BELOW else 0)
    if background is None:
        return alpha.getbbox()
    difference = ImageChops.difference(image.convert("RGB"), Image.new("RGB", image.size, background[:3]))
    strongest = ImageChops.lighter(ImageChops.lighter(*difference.split()[:2]), difference.split()[2])
    mark = strongest.point(lambda value: 255 if value > COLOUR_TOLERANCE else 0)
    return ImageChops.multiply(mark, alpha).getbbox()


def normalize_logo(uploaded):
    """Return the uploaded logo as a square LOGO_SIZE PNG, ready to assign to LawFirm.logo."""
    uploaded.seek(0)
    image = ImageOps.exif_transpose(Image.open(uploaded)).convert("RGBA")

    shave = round(min(image.size) * EDGE_SHAVE)
    if shave and min(image.size) > shave * 4:
        image = image.crop((shave, shave, image.width - shave, image.height - shave))

    background = _background(image)
    box = _content_box(image, background)
    if box:
        image = image.crop(box)

    side = round(max(image.size) / (1 - 2 * PADDING))
    canvas = Image.new("RGBA", (side, side), background or (0, 0, 0, 0))
    canvas.paste(image, ((side - image.width) // 2, (side - image.height) // 2), image)
    canvas = canvas.resize((LOGO_SIZE, LOGO_SIZE), Image.Resampling.LANCZOS)

    output = io.BytesIO()
    canvas.save(output, format="PNG", optimize=True)
    return ContentFile(output.getvalue(), name=f"{uuid.uuid4().hex}.png")
