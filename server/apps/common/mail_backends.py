from django.core.mail.backends.console import EmailBackend as ConsoleEmailBackend


class ReadableConsoleEmailBackend(ConsoleEmailBackend):
    """Print outgoing email as plain text during development.

    Django's console backend prints the encoded MIME message, where quoted-printable
    turns "=" into "=3D" and wraps long lines with a trailing "=". Password links
    copied from that output are corrupted, so this prints the headers and the
    decoded body instead.
    """

    def write_message(self, message):
        self.stream.write(f"Subject: {message.subject}\n")
        self.stream.write(f"From: {message.from_email}\n")
        self.stream.write(f"To: {', '.join(message.to)}\n")
        if message.cc:
            self.stream.write(f"Cc: {', '.join(message.cc)}\n")
        self.stream.write(f"\n{message.body}\n")
        for attachment in message.attachments:
            name = attachment[0] if isinstance(attachment, tuple) else attachment.get_filename()
            self.stream.write(f"[attachment: {name}]\n")
        self.stream.write("-" * 79 + "\n")
