#!/usr/bin/env python3
"""Verify FITILA public Play Store compliance pages are present and linked."""
from pathlib import Path
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[1]
PATHS = ("confidentialite", "assistance", "suppression-compte")

class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = set()
        self.title = False
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "a":
            self.links.add(attrs.get("href", ""))
        if tag == "title":
            self.title = True

for page in PATHS:
    f = ROOT / "public" / page / "index.html"
    assert f.is_file(), f"Missing page: {f}"
    html = f.read_text(encoding="utf-8")
    p = PageParser()
    p.feed(html)
    assert p.title, f"Missing title: {f}"
    assert '<html lang="fr">' in html, f"Missing French language: {f}"
    assert 'name="viewport"' in html, f"Missing mobile viewport: {f}"
    for other in PATHS:
        assert f"/{other}/" in p.links, f"Missing link to {other} in {f}"
    assert "FITILA" in html, f"Missing publisher identity: {f}"
print("OK: 3 FITILA compliance pages and cross-links validated")
