import io
import shutil
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, TestCase, override_settings
from PIL import Image, ImageDraw

from apps.common.choices import UserRole
from apps.firm.logo import LOGO_SIZE, normalize_logo
from apps.firm.models import LawFirm
from apps.users.models import User


def png(image):
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    buffer.seek(0)
    return buffer


def wide_dark_logo_on_white_page():
    """A dark 300x200 logo pasted on a white page, with a grey screenshot edge on top."""
    page = Image.new("RGBA", (900, 700), "white")
    ImageDraw.Draw(page).rectangle((0, 0, 899, 2), fill=(200, 200, 200, 255))
    mark = Image.new("RGBA", (300, 200), "black")
    ImageDraw.Draw(mark).ellipse((100, 50, 200, 150), fill=(120, 200, 60, 255))
    page.paste(mark, (300, 250))
    return page


class NormalizeLogoTests(SimpleTestCase):
    def test_output_is_always_the_same_square_png(self):
        for size in [(900, 700), (200, 900), (64, 64)]:
            result = Image.open(normalize_logo(png(Image.new("RGBA", size, "navy"))))
            self.assertEqual(result.size, (LOGO_SIZE, LOGO_SIZE))
            self.assertEqual(result.format, "PNG")

    def test_white_page_and_edge_lines_are_trimmed_away(self):
        result = Image.open(normalize_logo(png(wide_dark_logo_on_white_page()))).convert("RGBA")

        # The mark now spans the tile; its padding is the logo's own white page, not a letterbox.
        self.assertEqual(result.getpixel((0, 0)), (255, 255, 255, 255))
        self.assertEqual(result.getpixel((LOGO_SIZE // 2, LOGO_SIZE // 2)), (120, 200, 60, 255))
        dark_columns = [x for x in range(LOGO_SIZE) if result.getpixel((x, LOGO_SIZE // 2))[:3] == (0, 0, 0)]
        self.assertGreater(max(dark_columns) - min(dark_columns), LOGO_SIZE * 0.8)
        # The grey screenshot edge is gone.
        self.assertNotIn((200, 200, 200, 255), [result.getpixel((x, 0)) for x in range(LOGO_SIZE)])

    def test_dark_background_is_extended_instead_of_white_bars(self):
        logo = Image.new("RGBA", (872, 702), "black")
        ImageDraw.Draw(logo).rectangle((300, 150, 570, 550), fill=(120, 200, 60, 255))

        result = Image.open(normalize_logo(png(logo))).convert("RGBA")

        for corner in [(0, 0), (LOGO_SIZE - 1, 0), (0, LOGO_SIZE - 1), (LOGO_SIZE - 1, LOGO_SIZE - 1)]:
            self.assertEqual(result.getpixel(corner), (0, 0, 0, 255))

    def test_transparent_logos_stay_transparent(self):
        logo = Image.new("RGBA", (600, 200), (0, 0, 0, 0))
        ImageDraw.Draw(logo).rectangle((50, 50, 550, 150), fill=(18, 56, 90, 255))

        result = Image.open(normalize_logo(png(logo))).convert("RGBA")

        self.assertEqual(result.getpixel((0, 0))[3], 0)
        self.assertEqual(result.getpixel((LOGO_SIZE // 2, LOGO_SIZE // 2)), (18, 56, 90, 255))


class LawFirmLogoSaveTests(TestCase):
    def setUp(self):
        self.media = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.media, ignore_errors=True)

    def test_uploaded_logo_is_normalized_when_the_firm_is_saved(self):
        with override_settings(MEDIA_ROOT=self.media):
            owner = User.objects.create_user(
                email="logo-owner@example.com", password="strong-pass123", first_name="Logo", last_name="Owner",
                phone_number="+254700100099", national_id_number="700100099", role=UserRole.ADMIN,
            )
            firm = LawFirm.objects.create(name="Logo Firm", registration_number="LOGO-001", owner=owner)

            firm.logo = SimpleUploadedFile("logo.jpg", png(wide_dark_logo_on_white_page()).read(), "image/png")
            firm.save(update_fields=["logo", "updated_at"])

            firm.refresh_from_db()
            self.assertTrue(firm.logo.name.endswith(".png"))
            with firm.logo.open("rb") as stored:
                self.assertEqual(Image.open(stored).size, (LOGO_SIZE, LOGO_SIZE))
