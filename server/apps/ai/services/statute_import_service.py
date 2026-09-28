"""Parse Kenyan Acts published by Kenya Law in Akoma Ntoso HTML into searchable sections."""

import hashlib
import re
from dataclasses import dataclass, field
from html.parser import HTMLParser

VOID_TAGS = {"br", "img", "hr", "meta", "link", "input", "wbr", "col", "source"}
BLOCK_CLASSES = {"akn-subsection", "akn-paragraph", "akn-subparagraph", "akn-item", "akn-list", "akn-blockList", "akn-listIntroduction", "akn-wrapUp"}
HEADING_RE = re.compile(r"^\s*(\d+[A-Z]{0,3})\.\s*(.*)$")


@dataclass
class ParsedSection:
    eid: str
    part: str
    number: str = ""
    heading: str = ""
    chunks: list = field(default_factory=list)

    @property
    def text(self):
        lines = [" ".join(line.split()) for line in "".join(self.chunks).split("\n")]
        return "\n".join(line for line in lines if line)

    @property
    def checksum(self):
        return hashlib.sha256(f"{self.number}|{self.heading}|{self.text}".encode()).hexdigest()


class AknStatuteParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.skip_depth = None
        self.sections = []
        self.current = None
        self.depth = 0
        self.in_heading = False
        self.part = ""
        self.part_depth = None
        self.reading_part_heading = False

    def handle_starttag(self, tag, attrs):
        if tag in VOID_TAGS:
            if self.current is not None and tag == "br":
                self.current.chunks.append("\n")
            return
        attributes = dict(attrs)
        classes = set((attributes.get("class") or "").split())
        self.stack.append((tag, classes))
        level = len(self.stack)
        if self.skip_depth is not None:
            return
        if self.current is None and tag == "section" and classes & {"akn-part", "akn-chapter"}:
            self.part, self.part_depth = "", level
        elif self.current is None and self.part_depth is not None and tag == "h2" and not self.part:
            self.reading_part_heading = True
        if self.current is None and tag == "section" and "akn-section" in classes:
            eid = attributes.get("data-eid") or attributes.get("id") or ""
            if not eid.startswith("att"):
                self.current = ParsedSection(eid=eid, part=self.part)
                self.depth = level
            return
        if self.current is None:
            return
        if tag == "h3" and "akn-crossHeading" in classes:
            # A cross-heading at the end of a section titles the next group of sections.
            self.skip_depth = level
        elif tag == "h3" and level == self.depth + 1 and not self.current.number:
            self.in_heading = True
        elif classes & BLOCK_CLASSES or tag in {"p", "li", "tr"}:
            self.current.chunks.append("\n")

    def handle_endtag(self, tag):
        if tag in VOID_TAGS or not self.stack:
            return
        level = len(self.stack)
        _, classes = self.stack.pop()
        if self.skip_depth is not None:
            if level == self.skip_depth:
                self.skip_depth = None
            return
        if self.current is not None and "akn-num" in classes and not self.in_heading:
            self.current.chunks.append(" ")
        if tag == "h2":
            self.reading_part_heading = False
        if self.part_depth is not None and level == self.part_depth and tag == "section":
            self.part_depth = None
        if self.current is None:
            return
        if tag == "h3" and self.in_heading:
            self.in_heading = False
            match = HEADING_RE.match(self.current.heading)
            if match:
                self.current.number, self.current.heading = match.group(1), match.group(2).strip()
        if level == self.depth and tag == "section":
            if self.current.number and self.current.text:
                self.sections.append(self.current)
            self.current = None

    def handle_data(self, data):
        if self.skip_depth is not None:
            return
        if self.reading_part_heading:
            self.part += data
        elif self.current is not None:
            if self.in_heading:
                self.current.heading += data
            else:
                self.current.chunks.append(data)


def parse_statute(html):
    parser = AknStatuteParser()
    parser.feed(html)
    parser.close()
    for section in parser.sections:
        section.part = " ".join(section.part.split())
        section.heading = " ".join(section.heading.split())
    return parser.sections
