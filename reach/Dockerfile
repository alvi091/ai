# ayymus-reach — Agent Reach capability service.
# Build context MUST be the repo root:
#   gcloud builds submit --config=cloudbuild.yaml .

FROM python:3.12-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8080

# Node.js + npm (mcporter -> Exa search MCP), curl (Jina Reader / installers)
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl nodejs npm \
    && rm -rf /var/lib/apt/lists/*

# Agent Reach from GitHub — the PyPI package named "agent-reach" is a DIFFERENT
# project (README explicitly warns about it).
COPY reach/requirements.txt /tmp/reach-requirements.txt
RUN pip install -r /tmp/reach-requirements.txt \
    && pip install "https://github.com/Panniantong/agent-reach/archive/main.zip"

# MCP client used by Agent Reach's Exa search channel
RUN npm install -g mcporter

# Configure the zero-config channels (web/Jina, YouTube/yt-dlp, RSS, Exa/mcporter).
# `timeout` guards the build against an installer waiting on a prompt.
RUN timeout 900 agent-reach install --env=auto --system \
    || (echo "agent-reach install returned non-zero — /health will show channel status"; true)

WORKDIR /srv
COPY reach/app.py ./app.py

EXPOSE 8080

CMD ["sh", "-c", "exec uvicorn app:app --host 0.0.0.0 --port ${PORT:-8080} --log-level info"]
