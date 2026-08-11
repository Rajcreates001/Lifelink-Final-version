"""Clean HTML content, stripping navigation, ads, and boilerplate."""

import re


class HtmlCleaner:
    """Strip unwanted HTML elements and normalize text content."""

    def clean(self, html_text: str) -> str:
        text = re.sub(r"<style[^>]*>.*?</style>", "", html_text, flags=re.DOTALL)
        text = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.DOTALL)
        text = re.sub(r"<nav[^>]*>.*?</nav>", "", text, flags=re.DOTALL)
        text = re.sub(r"<footer[^>]*>.*?</footer>", "", text, flags=re.DOTALL)
        text = re.sub(r"<header[^>]*>.*?</header>", "", text, flags=re.DOTALL)
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"&nbsp;|&amp;|&lt;|&gt;|&quot;", " ", text)
        text = re.sub(r"\s+", " ", text)
        return text.strip()
