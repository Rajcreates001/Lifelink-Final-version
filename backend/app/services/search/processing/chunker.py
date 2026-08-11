"""Chunk long documents into smaller pieces."""


class Chunker:
    """Split long text into overlapping chunks."""

    CHUNK_SIZE = 800
    OVERLAP = 100

    def chunk(self, text: str) -> list[str]:
        if len(text) <= self.CHUNK_SIZE:
            return [text]
        chunks = []
        start = 0
        while start < len(text):
            end = min(start + self.CHUNK_SIZE, len(text))
            chunks.append(text[start:end])
            start += self.CHUNK_SIZE - self.OVERLAP
        return chunks
