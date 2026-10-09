# ayymus-reach — Agent Reach capability service.
# Build context MUST be the repo root:
#   gcloud builds submit --config=cloudbuild.yaml .

FROM python:3.12-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    NODE_VERSION=20.18.1 \
    PORT=8080

# curl/ca-certificates (Jina Reader, installers) + official Node 20 binary.
# mcporter needs modern Node — Debian bookworm only ships Node 18, which
# crashes mcporter on JSON module imports.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl xz-utils \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
       | tar -xJ -C /usr/local --strip-components=1 \
    && node --version && npm --version

# Agent Reach from GitHub — the PyPI package named "agent-reach" is a DIFFERENT
# project (README explicitly warns about it).
COPY reach/requirements.txt /tmp/reach-requirements.txt
RUN pip install -r /tmp/reach-requirements.txt \
    && pip install "https://github.com/Panniantong/agent-reach/archive/main.zip"

# MCP client used by Agent Reach's Exa search channel, plus the Exa MCP server
# registration (doctor reports "Exa 未配置" without this step).
RUN npm install -g mcporter \
    && timeout 120 mcporter config add exa https://mcp.exa.ai/mcp --scope home \
    && timeout 60 mcporter config list

# Configure the zero-config channels (web/Jina, YouTube/yt-dlp, RSS, Exa/mcporter).
# `timeout` guards the build against an installer waiting on a prompt.
RUN timeout 900 agent-reach install --env=auto --system \
    || (echo "agent-reach install returned non-zero — /health will show channel status"; true)

WORKDIR /srv
COPY reach/app.py ./app.py

EXPOSE 8080

CMD ["sh", "-c", "exec uvicorn app:app --host 0.0.0.0 --port ${PORT:-8080} --log-level info"]
