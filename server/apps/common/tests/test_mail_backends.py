import io

from django.core.mail import EmailMessage, get_connection
from django.test import SimpleTestCase


class ReadableConsoleEmailBackendTests(SimpleTestCase):
    def test_links_print_exactly_as_sent(self):
        # Long enough that quoted-printable would wrap it, with "=" it would encode.
        link = (
            "http://localhost:5173/reset-password?uid=NTRiMTMxNjgtZTc2OS00YzU0LTljYmMtYWE1ZWQ1MzVhNmNm"
            "&token=dfn5aw-a06770e26dc626fcc0758f47fc943272"
        )
        stream = io.StringIO()
        connection = get_connection("apps.common.mail_backends.ReadableConsoleEmailBackend", stream=stream)

        sent = connection.send_messages([
            EmailMessage("Kulecho & Co is ready", f"Set your password:\n\n{link}\n", "from@test", ["owner@test"]),
        ])

        output = stream.getvalue()
        self.assertEqual(sent, 1)
        self.assertIn(link, output.splitlines())
        self.assertIn("Subject: Kulecho & Co is ready", output)
        self.assertIn("To: owner@test", output)
        self.assertNotIn("=3D", output)
