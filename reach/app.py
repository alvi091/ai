"""
ayymus-reach — private HTTP wrapper around Agent Reach channels.

Agent Reach is a capability layer: it selects, installs and health-checks the
upstream tools but never wraps the reads itself. This service shells out to
those upstream tools exactly as its SKILL.md prescribes and exposes them as a
small JSON API for Ayymus (Node API / worker).

Endpoints
  GET  /        liveness
  GET  /health  `agent-reach doctor --json` (cached) — per-channel status
  POST /web     Jina Reader -> clean markdown for any page (with HTML fallback)
  POST /search  Exa semantic search via mcporter
  POST /youtube yt-dlp -> metadata + transcript
  POST /rss     feedparser -> entries

Runs private on Cloud Run (no unauthenticated access); Ayymus invokes it with
an invoker-only IAM binding. Every URL is validated to be public http(s).
"""

import asyncio
import ipaddress
import json
import logging
import re
import time
from html.parser import HTMLParser
from typing import Any, Optional
from urllib.parse import urlparse

import feedparser
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("ayymus-reach")

app = FastAPI(title="ayymus-reach", docs_url="/docs", redoc_url=None)


# --------------------------------------------------------------------------- #
# Validation / IO helpers
# --------------------------------------------------------------------------- #

def validate_url(url: Optional[str]) -> str:
    raw = (url or "").strip()
    if not raw:
        raise HTTPException(status_code=400, detail="url is required")
    parts = urlparse(raw)
    if parts.scheme not in ("http", "https"):
        raise HTTPException(status_code=400, detail="only http(s) URLs are supported")
    host = (parts.hostname or "").lower()
    if not host:
        raise HTTPException(status_code=400, detail="URL has no host")
    if host in ("localhost", "metadata.google.internal") or host.endswith((".local", ".internal")):
        raise HTTPException(status_code=400, detail="host not allowed")
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        ip = None
    if ip is not None and (
        ip.is_private or ip.is_loopback or ip.is_link_local
        or ip.is_reserved or ip.is_multicast or ip.is_unspecified
    ):
        raise HTTPException(status_code=400, detail="IP address not allowed")
    return raw


async def run_cmd(args: list, timeout_s: int) -> tuple:
    proc = await asyncio.create_subprocess_exec(
        *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        out_b, err_b = await asyncio.wait_for(proc.communicate(), timeout=timeout_s)
    except asyncio.TimeoutError:
        proc.kill()
        try:
            await asyncio.wait_for(proc.wait(), 5)
        except asyncio.TimeoutError:
            pass
        raise HTTPException(status_code=504, detail=f"{args[0]} timed out after {timeout_s}s")
    return (
        proc.returncode,
        out_b.decode("utf-8", "replace"),
        err_b.decode("utf-8", "replace"),
    )


async def http_get(url: str, timeout_s: int = 30, headers: dict = None, max_bytes: int = 4_000_000) -> str:
    import urllib.request

    hdrs = {"User-Agent": "ayymus-reach/1.0 (+https://ayymus.com)", "Accept": "*/*"}
    if headers:
        hdrs.update(headers)

    def _fetch() -> str:
        req = urllib.request.Request(url, headers=hdrs)
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            data = resp.read(max_bytes + 1)
            if len(data) > max_bytes:
                raise ValueError("response too large")
            charset = resp.headers.get_content_charset() or "utf-8"
            return data.decode(charset, "replace")

    return await asyncio.to_thread(_fetch)


def parse_json_loose(raw: str) -> Any:
    """Parse JSON from model/CLI output: whole string, code fences, or any
    bracketed object/array embedded in surrounding log noise."""
    if not raw:
        return None
    s = re.sub(r"^```(?:json)?\s*", "", raw.strip())
    s = re.sub(r"\s*```$", "", s)
    try:
        return json.loads(s)
    except Exception:
        pass
    decoder = json.JSONDecoder()
    for m in re.finditer(r"[\[{]", s):
        try:
            obj, _ = decoder.raw_decode(s[m.start():])
            return obj
        except Exception:
            continue
    return None


class _TextExtractor(HTMLParser):
    SKIP = {"script", "style", "noscript", "svg", "head", "iframe"}
    BLOCK = {
        "p", "div", "li", "br", "tr", "td", "th", "section", "article",
        "blockquote", "pre", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol",
    }

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts: list = []
        self._skip_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self._skip_depth += 1
        elif tag in self.BLOCK:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in self.SKIP and self._skip_depth:
            self._skip_depth -= 1
        elif tag in self.BLOCK:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self._skip_depth:
            self.parts.append(data)


def html_to_text(src: str) -> str:
    parser = _TextExtractor()
    try:
        parser.feed(src)
    except Exception:
        pass
    text = "".join(parser.parts)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n\n", text)
    return text.strip()


# --------------------------------------------------------------------------- #
# Models
# --------------------------------------------------------------------------- #

class WebRequest(BaseModel):
    url: str
    max_chars: int = 20000


class SearchRequest(BaseModel):
    query: str
    num: int = 6


class YoutubeRequest(BaseModel):
    url: str
    max_chars: int = 40000


class RssRequest(BaseModel):
    url: str
    limit: int = 10


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #

@app.get("/")
async def root():
    return {"ok": True, "service": "ayymus-reach"}


_doctor_cache = {"at": 0.0, "payload": None}


@app.get("/health")
async def health():
    """Per-channel status via `agent-reach doctor --json` (cached 120s —
    doctor really probes each backend, so it is slow by design)."""
    now = time.time()
    if _doctor_cache["payload"] and now - _doctor_cache["at"] < 120:
        return _doctor_cache["payload"]
    code, out, err = await run_cmd(["agent-reach", "doctor", "--json"], timeout_s=75)
    doctor = parse_json_loose(out) or {"raw": out[:4000], "stderr": err[:1000]}
    payload = {
        "ok": code == 0,
        "service": "ayymus-reach",
        "doctor": doctor,
        "checkedAt": int(now),
    }
    if code == 0:
        _doctor_cache.update(at=now, payload=payload)
    log.info("doctor rc=%s ok=%s", code, code == 0)
    return payload


@app.post("/web")
async def web(req: WebRequest):
    """Read a page as clean markdown. Backend order follows Agent Reach:
    Jina Reader first, plain fetch + HTML->text as fallback."""
    url = validate_url(req.url)
    errors = []

    try:
        md = (await http_get(
            "https://r.jina.ai/" + url,
            timeout_s=30,
            headers={"Accept": "text/plain"},
            max_bytes=3_000_000,
        )).strip()
        if len(md) >= 40:
            return {
                "ok": True, "url": url, "source": "jina",
                "text": md[:req.max_chars], "truncated": len(md) > req.max_chars,
            }
        errors.append("jina returned too little text")
    except Exception as exc:
        errors.append(f"jina: {exc}")

    try:
        raw = await http_get(url, timeout_s=25, max_bytes=2_000_000)
        text = html_to_text(raw)
        if len(text) >= 40:
            return {
                "ok": True, "url": url, "source": "html",
                "text": text[:req.max_chars], "truncated": len(text) > req.max_chars,
            }
        errors.append("html fallback too little text")
    except Exception as exc:
        errors.append(f"html: {exc}")

    raise HTTPException(status_code=502, detail=f"could not read page: {'; '.join(errors)}")


def _flatten_exa(data: Any) -> list:
    """Unwrap whatever shape mcporter/Exa hands back (MCP content blocks,
    nested {results:[...]}, raw lists, JSON strings)."""
    if data is None:
        return []
    if isinstance(data, str):
        parsed = parse_json_loose(data)
        return _flatten_exa(parsed) if parsed is not None else []
    if isinstance(data, list):
        out = []
        for item in data:
            if isinstance(item, dict):
                if "url" in item or "link" in item:
                    out.append(item)
                else:
                    out.extend(_flatten_exa(item))
            else:
                out.extend(_flatten_exa(item))
        return out
    if isinstance(data, dict):
        content = data.get("content")
        if isinstance(content, list):
            out = []
            for part in content:
                if isinstance(part, dict) and part.get("type") == "text":
                    out.extend(_flatten_exa(part.get("text")))
                else:
                    out.extend(_flatten_exa(part))
            return out
        for key in ("results", "data", "items", "organic", "posts", "contents"):
            if isinstance(data.get(key), list):
                return _flatten_exa(data[key])
        if "url" in data or "link" in data:
            return [data]
        out = []
        for value in data.values():
            if isinstance(value, (list, dict, str)):
                out.extend(_flatten_exa(value))
        return out
    return []


@app.post("/search")
async def search(req: SearchRequest):
    """Exa semantic search — Agent Reach's zero-config web search channel."""
    query = (req.query or "").strip()
    if not query:
        raise HTTPException(status_code=400, detail="query is required")
    num = max(1, min(req.num, 12))

    code, out, err = await run_cmd(
        ["mcporter", "call", "exa.web_search_exa", f"query={query}", f"numResults={num}"],
        timeout_s=35,
    )
    if code != 0 and not out.strip():
        raise HTTPException(
            status_code=502,
            detail=f"mcporter/exa failed: {(err or out)[:300]}",
        )
    data = parse_json_loose(out)
    if data is None:
        raise HTTPException(
            status_code=502,
            detail=f"exa returned unparseable output: {(out or err)[:300]}",
        )

    results = []
    for item in _flatten_exa(data):
        url = item.get("url") or item.get("link") or item.get("href")
        if not url:
            continue
        results.append({
            "title": str(item.get("title") or item.get("name") or "")[:300],
            "url": str(url),
            "snippet": str(
                item.get("text") or item.get("snippet")
                or item.get("description") or item.get("summary") or ""
            )[:1200],
        })
    log.info("search q=%r results=%d", query[:80], len(results))
    return {"ok": True, "query": query, "results": results[:num], "source": "exa"}


def _pick_caption(meta: dict) -> tuple:
    """Pick the best caption URL: explicit subtitles before auto-captions,
    English first, VTT format preferred. Returns (url, lang, is_auto)."""
    for lang_map, is_auto in ((meta.get("subtitles") or {}, False),
                              (meta.get("automatic_captions") or {}, True)):
        if not isinstance(lang_map, dict) or not lang_map:
            continue
        ordered = [l for l in ("en", "en-US", "en-GB", "en-IN", "hi") if l in lang_map]
        ordered += [l for l in lang_map if str(l).startswith("en") and l not in ordered]
        ordered += [l for l in lang_map if l not in ordered]
        for lang in ordered:
            entries = lang_map.get(lang) or []
            if not isinstance(entries, list):
                continue
            for want in ("vtt", "srt"):
                for entry in entries:
                    if isinstance(entry, dict) and entry.get("ext") == want and entry.get("url"):
                        return entry["url"], lang, is_auto
            for entry in entries:
                if isinstance(entry, dict) and entry.get("url"):
                    return entry["url"], lang, is_auto
    return None, None, False


def vtt_to_text(vtt: str) -> str:
    lines, seen = [], set()
    for line in vtt.splitlines():
        s = line.strip()
        if not s or s == "WEBVTT" or "-->" in s:
            continue
        if s.startswith(("Kind:", "Language:", "NOTE", "STYLE")):
            continue
        if re.fullmatch(r"\d+", s):
            continue
        s = re.sub(r"<[^>]+>", "", s)
        s = s.strip()
        if not s or s in seen:
            continue
        seen.add(s)
        lines.append(s)
    return " ".join(lines)


@app.post("/youtube")
async def youtube(req: YoutubeRequest):
    """Video metadata + transcript via yt-dlp (Agent Reach's YouTube channel)."""
    url = validate_url(req.url)
    code, out, err = await run_cmd(
        ["yt-dlp", "--dump-json", "--no-playlist", "--skip-download",
         "--socket-timeout", "15", url],
        timeout_s=45,
    )
    if code != 0 or not out.strip():
        raise HTTPException(status_code=502, detail=f"yt-dlp failed: {(err or out)[:300]}")
    try:
        meta = json.loads(out.splitlines()[0])
    except Exception:
        raise HTTPException(status_code=502, detail="yt-dlp returned unparseable metadata")

    caption_url, lang, is_auto = _pick_caption(meta)
    transcript, caption_error = "", None
    if caption_url:
        try:
            raw = await http_get(caption_url, timeout_s=20, max_bytes=5_000_000)
            transcript = vtt_to_text(raw)[:req.max_chars]
        except Exception as exc:
            caption_error = str(exc)[:200]

    log.info("youtube %s transcript=%d chars", url[:80], len(transcript))
    return {
        "ok": True,
        "url": url,
        "title": meta.get("title"),
        "channel": meta.get("uploader") or meta.get("channel"),
        "duration": meta.get("duration"),
        "views": meta.get("view_count"),
        "transcript": transcript,
        "captionLang": lang,
        "autoCaption": is_auto,
        "captionError": caption_error,
        "description": (meta.get("description") or "")[:2000],
    }


@app.post("/rss")
async def rss(req: RssRequest):
    """Read an RSS/Atom feed (Agent Reach's RSS channel)."""
    url = validate_url(req.url)
    raw = await http_get(url, timeout_s=25, max_bytes=4_000_000)
    feed = await asyncio.to_thread(feedparser.parse, raw)

    limit = max(1, min(req.limit, 50))
    entries = []
    for entry in feed.entries[:limit]:
        entries.append({
            "title": entry.get("title", ""),
            "link": entry.get("link", ""),
            "published": entry.get("published") or entry.get("updated") or "",
            "summary": re.sub(r"<[^>]+>", " ", entry.get("summary", ""))[:500].strip(),
        })
    if not entries and getattr(feed, "bozo", False):
        raise HTTPException(
            status_code=502,
            detail=f"could not parse feed: {str(getattr(feed, 'bozo_exception', ''))[:200]}",
        )
    return {
        "ok": True,
        "url": url,
        "feed": {"title": feed.feed.get("title", ""), "link": feed.feed.get("link", "")},
        "entries": entries,
        "count": len(entries),
    }
