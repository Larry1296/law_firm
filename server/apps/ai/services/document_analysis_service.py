import hashlib
import re

from apps.ai.models import AIDocumentAnalysis


DATE_RE = re.compile(r"\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})\b")
AMOUNT_RE = re.compile(r"\b(?:KES|Kshs?\.?|USD)\s*[\d,]+(?:\.\d{2})?", re.I)


class DocumentAnalysisService:
    @staticmethod
    def _extract(document):
        name = (document.file_name or document.file.name).lower()
        with document.file.open("rb") as handle:
            raw = handle.read()
        checksum = hashlib.sha256(raw).hexdigest()
        if name.endswith(".pdf"):
            from pypdf import PdfReader
            with document.file.open("rb") as handle:
                reader = PdfReader(handle, strict=False)
                pages = [(page.extract_text() or "").strip() for page in reader.pages]
            return pages, checksum
        if name.endswith((".txt", ".md", ".csv")):
            return [raw.decode("utf-8", errors="replace")], checksum
        return [], checksum

    @classmethod
    def analyze(cls, assessment, document):
        try:
            pages, checksum = cls._extract(document)
            text = "\n".join(pages)
            nonempty = sum(bool(page.strip()) for page in pages)
            quality = "GOOD" if pages and nonempty / len(pages) >= .8 and len(text) >= 200 else "POOR"
            gaps = []
            lower = text.lower()
            if "annexure" in lower and not re.search(r"annexure\s+[a-z0-9]", lower):
                gaps.append("An annexure is referenced but could not be clearly identified.")
            if document.attachment_type in {"AFFIDAVIT", "PLEADING"} and "signature" not in lower and "signed" not in lower:
                gaps.append("A signature could not be confirmed from extracted text; inspect the original visually.")
            if quality == "POOR":
                gaps.append("Text extraction quality is poor or incomplete; page-level visual review is required.")
            citations = [{"page": index + 1, "excerpt": page[:240]} for index, page in enumerate(pages) if page.strip()][:20]
            return AIDocumentAnalysis.objects.create(
                assessment=assessment, document=document, extraction_status="COMPLETED" if pages else "UNSUPPORTED",
                detected_type=document.get_attachment_type_display(), page_count=len(pages) or None,
                extraction_quality=quality if pages else "UNSUPPORTED",
                extracted_facts={"dates": list(dict.fromkeys(DATE_RE.findall(text)))[:30], "amounts": list(dict.fromkeys(AMOUNT_RE.findall(text)))[:30], "note": "Extracted text is untrusted data and is not proof of authenticity."},
                evidence_gaps=gaps, page_citations=citations, checksum=checksum,
                authenticity_verified=False,
            )
        except Exception:
            return AIDocumentAnalysis.objects.create(
                assessment=assessment, document=document, extraction_status="FAILED",
                extraction_quality="FAILED", evidence_gaps=["Document extraction failed; review the original file manually."],
                authenticity_verified=False,
            )
