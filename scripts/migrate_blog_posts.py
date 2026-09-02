from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BLOG_DIR = ROOT / "blog"
VERCEL_PATH = ROOT / "vercel.json"
SITEMAP_PATH = ROOT / "sitemap.xml"


def clean_slug(filename: str) -> str:
    return re.sub(r"\.html$", "", filename.removeprefix("blog-"))


def main() -> None:
    BLOG_DIR.mkdir(exist_ok=True)
    vercel = json.loads(VERCEL_PATH.read_text())
    rewrites = vercel.get("rewrites", [])

    # The existing clean route map is authoritative for articles already in the sitemap.
    route_by_file: dict[str, str] = {}
    for rule in rewrites:
        source = rule.get("source", "")
        destination = rule.get("destination", "")
        if source.startswith("/blog/") and destination.startswith("/blog-") and destination.endswith(".html"):
            route_by_file[Path(destination).name] = source

    posts = sorted(ROOT.glob("blog-*.html"))
    if not posts:
        raise SystemExit("No root blog-*.html posts found")

    for post in posts:
        route_by_file.setdefault(post.name, "/blog/" + clean_slug(post.name))

    # Update all source text before moving files so links are rewritten consistently.
    replacements: dict[str, str] = {}
    for filename, route in route_by_file.items():
        replacements["/" + filename] = route
        replacements[filename] = route

    for path in sorted(ROOT.glob("*.html")):
        if path.name == "blog.html" or path.name.startswith("blog-"):
            text = path.read_text()
            for old, new in replacements.items():
                text = text.replace(old, new)
            path.write_text(text)

    # Rewrite references in already-nested blog files after moving them.
    for post in posts:
        target = BLOG_DIR / post.name
        text = post.read_text()
        for old, new in replacements.items():
            text = text.replace(old, new)
        target.write_text(text)
        post.unlink()

    # Update the sitemap from legacy/root article paths to clean public paths.
    if SITEMAP_PATH.exists():
        sitemap = SITEMAP_PATH.read_text()
        for filename, route in route_by_file.items():
            sitemap = sitemap.replace("https://trystellarai.com/" + filename, "https://trystellarai.com" + route)
        SITEMAP_PATH.write_text(sitemap)

    # Point clean routes at /blog/<file>, and keep old .html URLs as permanent redirects.
    new_rewrites = []
    seen_sources: set[str] = set()
    for rule in rewrites:
        source = rule.get("source", "")
        destination = rule.get("destination", "")
        if source.startswith("/blog/") and destination.startswith("/blog-") and destination.endswith(".html"):
            filename = Path(destination).name
            rule = {**rule, "destination": "/blog/" + filename}
        new_rewrites.append(rule)
        seen_sources.add(source)
    for filename, route in sorted(route_by_file.items()):
        if route not in seen_sources:
            new_rewrites.insert(0, {"source": route, "destination": "/blog/" + filename})
    vercel["rewrites"] = new_rewrites

    redirects = vercel.get("redirects", [])
    redirect_sources = {r.get("source") for r in redirects}
    for filename, route in sorted(route_by_file.items()):
        old = "/" + filename
        if old not in redirect_sources:
            redirects.append({"source": old, "destination": route, "permanent": True})
    vercel["redirects"] = redirects
    VERCEL_PATH.write_text(json.dumps(vercel, indent=2) + "\n")

    print(json.dumps({
        "moved_posts": len(posts),
        "blog_directory": str(BLOG_DIR),
        "routes": len(route_by_file),
        "redirects_added": len(posts),
    }, indent=2))


if __name__ == "__main__":
    main()
