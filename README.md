<div align="center">

# 🎙️ Code To AI Podcast

**Turn any GitHub commit or pull request into a broadcast-quality, two-host AI podcast.**

[![Live](https://img.shields.io/badge/live-mcp.daniyal.online-ff5c35?style=for-the-badge)](https://mcp.daniyal.online)
![Python](https://img.shields.io/badge/python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FFmpeg](https://img.shields.io/badge/FFmpeg-DSP-007808?style=for-the-badge&logo=ffmpeg&logoColor=white)
![MCP](https://img.shields.io/badge/MCP-server-111?style=for-the-badge)
![Docker](https://img.shields.io/badge/docker-ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)

*PR roasts · code explainers · incident postmortems — mixed, mastered, and ready to play.*

</div>

---

## ✨ What it does

Paste a public GitHub repo, pick a commit or PR, choose a format, and hit **Generate**. Seconds later you get a mastered MP3 with two hosts quoting your *actual* code changes, a DAW-style timeline, and a live view of the MCP JSON-RPC calls that built it.

| | Feature | Details |
|---|---|---|
| 🎭 | **3 show formats** | 2-Host PR Roast · Code Explainer · Incident Postmortem |
| 🧠 | **Smart scriptwriter** | Groq `gpt-oss-120b` with a rule-based fallback that never fails |
| 🔍 | **Real code analysis** | Spots debug prints, swallowed errors, TODOs, skipped tests, risky locks/auth/SQL |
| 🗣️ | **Natural speech** | No commit hashes or full paths read aloud — clean, human phrasing |
| 🎚️ | **Broadcast DSP** | Ducking, panning, SFX cues, EBU R128 loudness normalisation |
| 🌐 | **Three modes** | Interactive demo · Online (zero install) · Offline (private code, local) |
| 🚦 | **Fair queue** | Concurrent users wait in line with live position updates |

---

## 🧭 How it works

```mermaid
flowchart LR
    A[👤 User pastes<br/>GitHub repo] --> B[Browser fetches<br/>public diff]
    B --> C[POST /api/episodes<br/>source=custom]
    C --> D{Render queue<br/>2 at a time}
    D --> E[🧠 Scriptwriter<br/>Groq → fallback]
    E --> F[🗣️ TTS<br/>Edge / Kokoro / ElevenLabs]
    F --> G[🎚️ FFmpeg DSP<br/>mix · duck · master]
    G --> H[🎧 MP3 + timeline<br/>back to the browser]
```

### Episode lifecycle

```mermaid
sequenceDiagram
    participant U as Browser
    participant GH as GitHub API
    participant S as Podcast Server
    participant L as Groq LLM
    participant T as TTS
    U->>GH: list commits & PRs
    U->>GH: fetch diff
    U->>S: create episode (diff, format)
    S-->>U: episode id (<50 ms)
    loop poll
        U->>S: status?
        S-->>U: queued #N / writing / voicing / mixing
    end
    S->>L: diff → dialogue JSON
    L-->>S: script (or fallback)
    S->>T: synthesize each line
    S->>S: FFmpeg filtergraph + loudness
    S-->>U: done → MP3 + manifest
```

### Script pipeline

```mermaid
flowchart TD
    D[Raw diff] --> P[Parse hunks]
    P --> SM[Detect code smells]
    P --> SN[Sanitize names<br/>paths · hashes · #ids]
    SM --> W{GROQ_API_KEY?}
    SN --> W
    W -- yes --> G[LLM writer]
    W -- no / error --> R[Rule-based writer<br/>randomized banter]
    G --> O[Dialogue lines + SFX cues]
    R --> O
```

---

## 🏗️ Architecture

```mermaid
graph TB
    subgraph Web["🌐 Web studio"]
        UI[Mode picker] --> DEMO[Demo]
        UI --> ON[Online]
        UI --> OFF[Offline]
        DAW[DAW timeline · Inspector · Visualizer]
    end
    subgraph Cloud["☁️ Hosted server (Docker)"]
        API[FastAPI /api/*] --> Q[Queue]
        Q --> SW[Scriptwriter] --> TTS[TTS] --> DSP[FFmpeg]
    end
    subgraph Local["💻 Your machine"]
        LAPI[Same server on localhost] --> GIT[git diff of private repos]
        MCP[MCP server for AI agents]
    end
    ON --> API
    OFF --> LAPI
    DSP --> DAW
    LAPI --> DAW
```

Only the active mode talks to its server — online never touches localhost, offline never contacts the cloud.

---

## 📊 Performance

On a 2-core ARM server with 12 GB RAM:

```mermaid
xychart-beta
    title "Avg wait per user (seconds)"
    x-axis ["1 user", "2 users", "5 users", "10 users"]
    y-axis "seconds" 0 --> 60
    bar [10, 11, 28, 50]
```

```mermaid
pie title Where render time goes
    "Script writing" : 15
    "Voice synthesis" : 50
    "Mixing & mastering" : 35
```

*Approximate figures; voice synthesis runs in the cloud, so CPU is mostly spent on mixing.*

---

## 🚀 Quick start

### Online — zero install
Open **[mcp.daniyal.online](https://mcp.daniyal.online)**, choose **Online**, paste a public repo like `sindresorhus/slugify`, and generate.

### Self-host the server
```bash
git clone https://github.com/daniyallko/code-to-ai-podcast.git
cd code-to-ai-podcast
docker build -t podcast-api ./mcp-server
docker run -d --name podcast-api --restart unless-stopped -p 8000:8000 \
  -e TTS_PROVIDER=edge -e GROQ_API_KEY=your_key podcast-api
curl -s http://localhost:8000/api/status
```

### Offline — private code
Choose **Offline** on the site and copy the setup prompt into your AI coding agent. It checks what's already installed and only adds what's missing — re-pasting it just reconnects.

### Run the web studio locally
```bash
bun install
bun run dev
```

---

## ⚙️ Configuration

| Variable | Default | Purpose |
|---|---|---|
| `TTS_PROVIDER` | `edge` | `edge`, `kokoro`, or `elevenlabs` |
| `GROQ_API_KEY` | — | Enables the LLM scriptwriter |
| `GROQ_MODEL` | `openai/gpt-oss-120b` | Override the Groq model |
| `HOST` / `--host` | `127.0.0.1` | Bind address (Docker uses `0.0.0.0`) |

---

## 🗂️ Project layout

```
├── src/                 # Web studio (React + TanStack Start)
│   ├── components/      # DAW, inspector, mode panels
│   └── lib/             # GitHub client, server hooks, demo scenario
├── mcp-server/
│   ├── src/             # FastAPI + MCP server, scriptwriter, TTS, DSP
│   ├── tests/           # pytest suite
│   └── Dockerfile
└── docker-compose.yml
```

---

## 🧪 Tests

```bash
cd mcp-server && pip install -e . && pytest     # server
bunx vitest run                                  # web
```

---

<div align="center">

Made with ☕ by **[Mohd Daniyal](https://github.com/daniyallko)** · If this made you laugh at your own PR, drop a ⭐

</div>
