"""Turn a headline + snippet into a vector ("fingerprint of meaning").

Production uses a small multilingual model, so a Telugu and an English report
of the same incident land close together. Tests and machines without the
model use a lexical fallback (character n-grams), which only matches
same-language wording.

Choose with EMBEDDER=multilingual | lexical (default: multilingual if the
library is installed, else lexical). Each embedder has its own grouping
threshold; override with GROUP_THRESHOLD.
"""
from __future__ import annotations

import math
import os
import re
import sys
import zlib
from collections import Counter

from pipeline.tagging import normalise

MODEL_NAME = os.environ.get("EMBED_MODEL", "intfloat/multilingual-e5-small")


class LexicalEmbedder:
    name = "lexical-v1"
    dims = 2048
    threshold = 0.52

    def embed(self, texts: list[str]) -> list[list[float]]:
        return [self._one(t) for t in texts]

    def _one(self, text: str) -> list[float]:
        t = normalise(text).lower()
        t = re.sub(r"[^\w\s]", " ", t)
        t = re.sub(r"\s+", " ", t).strip()
        grams: Counter = Counter()
        for word in t.split(" "):
            w = f" {word} "
            for n in (3, 4, 5):
                for i in range(max(0, len(w) - n + 1)):
                    grams[w[i:i + n]] += 1
        vec = [0.0] * self.dims
        for g, c in grams.items():
            h = zlib.crc32(g.encode("utf-8"))
            vec[h % self.dims] += (1 + math.log(c)) * (1 if (h >> 16) & 1 else -1)
        return _unit(vec)


class MultilingualEmbedder:
    """intfloat/multilingual-e5-small: ~120M parameters, 100 languages incl. Telugu and Hindi."""

    dims = 384
    # Measured on 2,485 real headlines (30 Sep 2026): unrelated pairs score ~0.79 (median) to
    # 0.90 (top 0.1 %), so 0.88 merged unrelated reports; at 0.905 sampled groups were ~9/10 right.
    threshold = 0.905

    def __init__(self, model_name: str = MODEL_NAME):
        from sentence_transformers import SentenceTransformer  # heavy import, only in production

        self.model = SentenceTransformer(model_name, device="cpu")
        self.name = model_name

    def embed(self, texts: list[str]) -> list[list[float]]:
        # e5 models expect a prefix; "query: " suits symmetric similarity.
        vecs = self.model.encode([f"query: {normalise(t)}" for t in texts], batch_size=32,
                                 normalize_embeddings=True, show_progress_bar=False)
        return [[round(float(x), 5) for x in v] for v in vecs]


def get_embedder():
    choice = os.environ.get("EMBEDDER", "").lower()
    if choice == "lexical":
        emb = LexicalEmbedder()
    else:
        try:
            emb = MultilingualEmbedder()
        except ImportError:
            if choice == "multilingual":
                raise
            print("sentence-transformers not installed: using lexical embedder "
                  "(same-language grouping only)", file=sys.stderr)
            emb = LexicalEmbedder()
    if os.environ.get("GROUP_THRESHOLD"):
        emb.threshold = float(os.environ["GROUP_THRESHOLD"])
    return emb


def article_text(title: str, snippet: str | None) -> str:
    # Headline counts twice: it carries the incident; snippets carry more noise.
    return f"{title}. {title}. {(snippet or '')[:200]}"


def _unit(vec: list[float]) -> list[float]:
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / norm for x in vec]


def cosine(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


def mean_unit(vectors: list[list[float]]) -> list[float]:
    if not vectors:
        return []
    acc = [0.0] * len(vectors[0])
    for v in vectors:
        for i, x in enumerate(v):
            acc[i] += x
    return _unit(acc)
