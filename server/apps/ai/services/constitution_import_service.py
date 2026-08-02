import hashlib
import re
from dataclasses import dataclass


ARTICLE_RE = re.compile(r"^\s*(\d{1,3}[A-Z]?)\.\s*(.*)$")
CHAPTER_RE = re.compile(r"^CHAPTER\s+([A-Z0-9]+)(?:\s*[—:-]\s*|\s+)(.+)$", re.I)
PART_RE = re.compile(r"^PART\s+([A-Z0-9]+)(?:\s*[—:-]\s*|\s+)(.+)$", re.I)
SCHEDULE_RE = re.compile(r"^(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH)\s+SCHEDULE(?:\s*$|\s*\()", re.I)
CLAUSE_RE = re.compile(r"^\s*\((\d+)\)\s*(.+)")


@dataclass
class ParsedProvision:
    unit_type: str
    stable_key: str
    chapter: str
    part: str
    article_number: str
    heading: str
    text: str
    clauses: list
    display_order: int

    @property
    def checksum(self):
        return hashlib.sha256(self.text.encode("utf-8")).hexdigest()


def extract_pdf_text(path):
    if str(path).endswith(":Zone.Identifier"):
        raise ValueError("Windows metadata streams are not valid legal sources.")
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise RuntimeError("pypdf is required; install server requirements first.") from exc
    reader = PdfReader(str(path), strict=False)
    if len(reader.pages) < 50:
        raise ValueError("Constitution PDF appears incomplete.")
    pages = []
    failed_pages = 0
    for page in reader.pages:
        try:
            text = page.extract_text(extraction_mode="layout") or ""
        except Exception:
            failed_pages += 1
            text = ""
        pages.append(text)
    if failed_pages > max(5, len(reader.pages) // 10):
        raise ValueError(f"Text extraction failed for {failed_pages} pages.")
    return "\n".join(pages)


def _clean_lines(text):
    lines = []
    for raw in text.replace("\u00a0", " ").splitlines():
        line = re.sub(r"\s+", " ", raw).strip()
        if not line or re.fullmatch(r"\d+", line) or line in {"Constitution of Kenya, 2010", "CONSTITUTION OF KENYA"}:
            continue
        lines.append(line)
    return lines


def parse_constitution(text):
    lines = _clean_lines(text)
    if len(" ".join(lines)) < 100_000:
        raise ValueError("Extracted Constitution text is unexpectedly short or corrupted.")
    preamble_positions = [index for index, line in enumerate(lines) if line.upper() == "PREAMBLE"]
    if not preamble_positions:
        raise ValueError("Extraction validation failed: Preamble was not found.")
    lines = lines[preamble_positions[-1]:]
    provisions = []
    chapter = part = ""
    current = None
    preamble_lines = []
    schedule = None
    started = False

    def finish():
        nonlocal current
        if not current:
            return
        body = "\n".join(current.pop("lines")).strip()
        if len(body) >= 10:
            clauses = [
                {"number": match.group(1), "text": match.group(2)}
                for line in body.splitlines()
                if (match := CLAUSE_RE.match(line))
            ]
            provisions.append(ParsedProvision(text=body, clauses=clauses, **current))
        current = None

    for line in lines:
        if not started:
            if line.upper() == "PREAMBLE":
                started = True
                preamble_lines.append(line)
            continue
        chapter_match = CHAPTER_RE.match(line)
        part_match = PART_RE.match(line)
        schedule_match = SCHEDULE_RE.match(line)
        article_match = ARTICLE_RE.match(line)
        if chapter_match:
            finish()
            chapter = f"Chapter {chapter_match.group(1)} — {chapter_match.group(2).title()}"
            part = ""
            continue
        if part_match:
            finish()
            part = f"Part {part_match.group(1)} — {part_match.group(2).title()}"
            continue
        if schedule_match:
            finish()
            schedule = schedule_match.group(0).title()
            current = {
                "unit_type": "schedule", "stable_key": schedule.lower().replace(" ", "-"),
                "chapter": chapter, "part": part, "article_number": "", "heading": schedule,
                "lines": [line], "display_order": 1000 + len(provisions),
            }
            continue
        if article_match and not schedule:
            number = article_match.group(1)
            body_start = article_match.group(2).strip()
            heading = ""
            if current and current["lines"]:
                candidate = current["lines"][-1]
                if len(candidate) <= 300 and candidate.endswith(".") and not candidate.startswith(("(", "[")):
                    heading = current["lines"].pop().rstrip(".")
            elif preamble_lines:
                candidate = preamble_lines[-1]
                if len(candidate) <= 300 and candidate.endswith("."):
                    heading = preamble_lines.pop().rstrip(".")
            finish()
            current = {
                "unit_type": "article", "stable_key": f"article-{number.lower()}",
                "chapter": chapter, "part": part, "article_number": number,
                "heading": heading, "lines": [body_start] if body_start else [],
                "display_order": int(re.sub(r"\D", "", number)),
            }
            continue
        if current:
            current["lines"].append(line)
        elif preamble_lines:
            preamble_lines.append(line)
    finish()
    if preamble_lines:
        preamble = "\n".join(preamble_lines).strip()
        provisions.insert(0, ParsedProvision("preamble", "preamble", "", "", "", "Preamble", preamble, [], 0))
    # Prefer the longest occurrence for duplicated contents/body article keys.
    deduped = {}
    for provision in provisions:
        previous = deduped.get(provision.stable_key)
        if previous is None or len(provision.text) > len(previous.text):
            deduped[provision.stable_key] = provision
    result = sorted(deduped.values(), key=lambda item: item.display_order)
    article_numbers = {item.article_number for item in result if item.unit_type == "article"}
    if len(article_numbers) < 200 or "1" not in article_numbers or "260" not in article_numbers:
        raise ValueError(f"Extraction validation failed: found only {len(article_numbers)} credible Articles.")
    return result
