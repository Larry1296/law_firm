import io
import shutil
import tempfile
from unittest import mock

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


class OwnerLogoUploadTests(TestCase):
    """The firm owner changes the logo from the Firm page; any shape comes out the same square size."""

    def setUp(self):
        from rest_framework.test import APIClient

        self.media = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.media, ignore_errors=True)
        media = override_settings(MEDIA_ROOT=self.media)
        media.enable()
        self.addCleanup(media.disable)
        self.owner = User.objects.create_user(
            email="owner-logo@example.com", password="strong-pass123", first_name="Logo", last_name="Owner",
            phone_number="+254700100098", national_id_number="700100098", role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(name="Owner Logo Firm", registration_number="LOGO-002", owner=self.owner)
        self.api = APIClient()
        self.api.force_authenticate(self.owner)

    def upload(self, content, name="logo.png", content_type="image/png"):
        return self.api.post("/api/admin/firm/logo/", {"logo": SimpleUploadedFile(name, content, content_type)}, format="multipart")

    def test_any_shape_is_stored_as_the_same_square(self):
        for size in ((1200, 300), (200, 900), (64, 64)):
            response = self.upload(png(Image.new("RGBA", size, "navy")).read())
            self.assertEqual(response.status_code, 200, response.data)
            self.assertTrue(response.data["firm"]["logo_url"].startswith(f"/firm-logo/{self.firm.id}/"))
            self.firm.refresh_from_db()
            with self.firm.logo.open("rb") as stored:
                self.assertEqual(Image.open(stored).size, (LOGO_SIZE, LOGO_SIZE), size)

    def test_rejects_files_that_are_not_images(self):
        response = self.upload(b"not an image", name="logo.png")
        self.assertEqual(response.status_code, 400)
        self.firm.refresh_from_db()
        self.assertFalse(self.firm.logo)

    def test_rejects_logos_over_2_mb(self):
        from apps.firm.serializers import logo_serializer

        with mock.patch.object(logo_serializer, "MAX_LOGO_BYTES", 100):
            response = self.upload(png(Image.new("RGBA", (400, 400), "navy")).read())
        self.assertEqual(response.status_code, 400)
        self.assertIn("2 MB", str(response.data))

    def test_owner_can_remove_the_logo(self):
        self.upload(png(Image.new("RGBA", (300, 300), "navy")).read())
        response = self.api.delete("/api/admin/firm/logo/")
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["firm"]["logo_url"])

    def test_the_profile_update_cannot_set_the_logo(self):
        content = png(Image.new("RGBA", (300, 300), "navy")).read()
        self.api.patch("/api/admin/firm/", {"logo": SimpleUploadedFile("logo.png", content, "image/png")}, format="multipart")
        self.firm.refresh_from_db()
        self.assertFalse(self.firm.logo)

    def test_staff_cannot_change_the_logo(self):
        staff = User.objects.create_user(
            email="staff-logo@example.com", password="strong-pass123", first_name="Staff", last_name="Member",
            phone_number="+254700100097", national_id_number="700100097", role=UserRole.STAFF,
        )
        self.api.force_authenticate(staff)
        self.assertEqual(self.upload(png(Image.new("RGBA", (300, 300), "navy")).read()).status_code, 403)
