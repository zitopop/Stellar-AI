#!/usr/bin/env python3
"""Lightweight weekly public SEO checks; no paid API keys or AI content spam."""
from html.parser import HTMLParser
from urllib.request import Request, urlopen
from urllib.parse import urlparse
import sys
import xml.etree.ElementTree as ET

BASE = "https://trystellarai.com"
CRITICAL = [
    "/", "/app", "/blog", "/plans", "/free-tools",
    "/ai-game-script-generator", "/roblox-script-generator",
    "/blog/fivem-bank-heist-script", "/blog/qbcore-drug-system",
]
SITEMAPS = ["/sitemap.xml", "/sitemap-seo.xml", "/sitemap-growth.xml"]
HEADERS = {"User-Agent": "StellarAI-SEO-Health/1.0 (+https://trystellarai.com/)"}
errors = []
notes = []


def fetch(path):
    request = Request(BASE + path, headers=HEADERS)
    with urlopen(request, timeout=20) as response:
        if response.status != 200:
            raise ValueError(f"HTTP {response.status}")
        if urlparse(response.url).netloc != "trystellarai.com":
            raise ValueError(f"Unexpected redirect: {response.url}")
        return response.read(2_000_000).decode("utf-8", "replace")


class HeadParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title_seen = False
        self.meta_description = ""
        self.canonical = ""
        self.robots = ""
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "title":
            self.title_seen = True
        if tag == "meta" and attrs.get("name", "").lower() == "description":
            self.meta_description = attrs.get("content", "").strip()
        if tag == "meta" and attrs.get("name", "").lower() == "robots":
            self.robots = attrs.get("content", "").lower()
        if tag == "link" and "canonical" in attrs.get("rel", "").lower().split():
            self.canonical = attrs.get("href", "")


def check():
    try:
        robots = fetch("/robots.txt")
        if "Sitemap: " + BASE + "/sitemap-index.xml" not in robots:
            errors.append("robots.txt does not point to the sitemap index")
        if any(line.strip().lower() == "disallow: /" for line in robots.splitlines()):
            errors.append("robots.txt contains a sitewide Disallow: /")
        notes.append("robots.txt served successfully")
    except Exception as exc:
        errors.append(f"/robots.txt: {exc}")

    discovered = set()
    try:
        index = ET.fromstring(fetch("/sitemap-index.xml"))
        paths = {e.text.strip() for e in index.iter() if e.tag.endswith("}loc") and e.text}
        expected = {BASE + p for p in SITEMAPS}
        if not expected.issubset(paths):
            errors.append("sitemap-index.xml is missing one or more published child sitemaps")
    except Exception as exc:
        errors.append(f"/sitemap-index.xml: {exc}")

    for path in SITEMAPS:
        try:
            root = ET.fromstring(fetch(path))
            if not root.tag.endswith("urlset"):
                raise ValueError("Not a urlset")
            locs = [e.text.strip() for e in root.iter() if e.tag.endswith("}loc") and e.text]
            if not locs:
                errors.append(path + " has no URLs")
            if len(locs) != len(set(locs)):
                errors.append(path + " contains duplicate loc entries")
            for loc in locs:
                if not loc.startswith(BASE + "/"):
                    errors.append(path + " contains an off-domain or non-HTTPS loc: " + loc)
                discovered.add(loc)
            notes.append(f"{path}: {len(locs)} URL entries")
        except Exception as exc:
            errors.append(f"{path}: {exc}")

    for path in CRITICAL:
        url = BASE + path
        if url not in discovered:
            errors.append(f"{path}: missing from all sitemaps")
        try:
            parser = HeadParser()
            parser.feed(fetch(path).split("</head>", 1)[0])
            if not parser.title_seen:
                errors.append(path + ": missing <title>")
            if not parser.meta_description:
                errors.append(path + ": missing meta description")
            if parser.canonical != url:
                errors.append(f"{path}: canonical {parser.canonical!r}, expected {url!r}")
            if "noindex" in parser.robots:
                errors.append(path + ": noindex prevents organic search")
        except Exception as exc:
            errors.append(f"{path}: {exc}")

    notes.append(f"Checked {len(CRITICAL)} core pages; {len(discovered)} unique sitemap URLs")


if __name__ == "__main__":
    check()
    for note in notes:
        print("OK:", note)
    for err in errors:
        print("ERROR:", err)
    print("Stellar SEO health:", "PASS" if not errors else "FAIL")
    sys.exit(1 if errors else 0)
