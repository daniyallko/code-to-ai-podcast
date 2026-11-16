import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Terminal } from "lucide-react";
import {
  OSES,
  SAMPLE_DIR,
  getAgents,
  prereqSteps,
  type OsKey,
} from "@/components/showcase/AgentConfigs";
import { UV_DEV_VALIDATION, UV_DEV_VALIDATION_KOKORO, UV_SYNC_KOKORO } from "@/lib/setupCommands";
import { StudioHeader } from "@/components/showcase/StudioHeader";
import { CopyButton } from "@/components/showcase/CopyButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Setup Guide — StudioEngineer MCP on Windows, macOS & Linux" },
      {
        name: "description",
        content:
          "Step-by-step setup for StudioEngineer MCP with Claude Desktop, Cursor, Codex, Antigravity, Claude Code and VS Code.",
      },
      { property: "og:title", content: "StudioEngineer MCP Setup Guide" },
      {
        property: "og:description",
        content:
          "Install, configure and test the StudioEngineer MCP server with your coding agent on any OS.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SetupPage,
});

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative mt-2 min-w-0">
      <pre className="overflow-x-auto rounded-md border border-border bg-background p-4 pr-20 font-mono text-[11px] leading-5 text-wave">
        {code}
      </pre>
      <CopyButton text={code} className="absolute right-2 top-2 bg-surface-2" />
    </div>
  );
}

function SectionHeading({
  number,
  title,
  detail,
}: {
  number: string;
  title: string;
  detail?: string;
}) {
  return (
    <div className="border-b border-border px-4 py-4 sm:px-5">
      <p className="font-mono text-[9px] tracking-[0.16em] text-primary">RACK {number}</p>
      <h2 className="mt-1 text-lg font-semibold tracking-tight">{title}</h2>
      {detail && <p className="mt-1 text-sm text-muted-foreground">{detail}</p>}
    </div>
  );
}

function SetupPage() {
  const [os, setOs] = useState<OsKey>("mac");
  const [dir, setDir] = useState("");
  const agents = getAgents(os, dir.trim().replace(/\\/g, "/") || SAMPLE_DIR[os]);
  const [agentKey, setAgentKey] = useState(agents[0]!.key);

  return (
    <main className="pb-20">
      <StudioHeader
        status={{ tone: "neutral", label: "Local setup guide", detail: "No server probe" }}
      />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-5 md:py-12">
        <Link
          to="/"
          className="inline-flex min-h-9 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> ← Back to studio
        </Link>
        <header className="mt-5 border-l-2 border-primary pl-4">
          <p className="font-mono text-[9px] tracking-[0.16em] text-primary">
            OFFLINE BROADCAST · MCP CONNECTION
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            Set up StudioEngineer MCP
          </h1>
          <p className="mt-3 max-w-2xl leading-6 text-muted-foreground">
            Runs locally on your computer and talks to your coding agent over stdio. Pick your
            system, then your agent.
          </p>
        </header>

        <div className="mt-6">
          <p className="mb-2 font-mono text-[10px] tracking-[0.12em] text-muted-foreground">
            OPERATING SYSTEM
          </p>
          <div
            role="group"
            aria-label="Operating system"
            className="inline-flex flex-wrap gap-1 rounded-md border border-border bg-card p-1"
          >
            {OSES.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={item.key === os}
                onClick={() => setOs(item.key)}
                className={`min-h-11 rounded px-4 font-mono text-xs ${item.key === os ? "bg-surface-2 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 space-y-6">
          <section className="rack-panel overflow-hidden">
            <SectionHeading
              number="01"
              title="Install"
              detail="Prepare the local runtime and project files."
            />
            <ol className="space-y-3 p-4 sm:p-5">
              {prereqSteps(os).map((step, index) => (
                <li
                  key={step.title}
                  className="rounded-md border border-border bg-background/40 p-4"
                >
                  <p className="text-sm font-medium">
                    <span className="mr-2 font-mono text-primary">{index + 1}.</span>
                    {step.title}
                  </p>
                  {step.body && (
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.body}</p>
                  )}
                  {step.code && <CodeBlock code={step.code} />}
                </li>
              ))}
            </ol>
          </section>

          <section className="rack-panel overflow-hidden">
            <SectionHeading
              number="02"
              title="Connect your agent"
              detail="Generate an exact configuration for your client and local path."
            />
            <div className="p-4 sm:p-5">
              <label className="block font-mono text-[10px] text-muted-foreground">
                Your mcp-server folder path (fills in the config below)
                <input
                  value={dir}
                  onChange={(event) => setDir(event.target.value)}
                  placeholder={SAMPLE_DIR[os]}
                  className="mt-2 min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs text-foreground"
                />
              </label>
              <Tabs value={agentKey} onValueChange={setAgentKey} className="mt-5">
                <TabsList className="h-auto flex-wrap justify-start bg-background">
                  {agents.map((agent) => (
                    <TabsTrigger
                      key={agent.key}
                      value={agent.key}
                      className="min-h-10 text-xs data-[state=active]:bg-surface-2"
                    >
                      {agent.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {agents.map((agent) => (
                  <TabsContent
                    key={agent.key}
                    value={agent.key}
                    className="rounded-md border border-border bg-card p-4"
                  >
                    <p className="font-mono text-xs text-muted-foreground">
                      {agent.file === "terminal" ? "Run in a terminal" : agent.file}
                    </p>
                    <CodeBlock code={agent.config} />
                    <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
                      {agent.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                    <p className="mt-3 text-sm">
                      <span className="inline-flex items-center gap-1 text-signal">
                        <CheckCircle2 className="size-4" /> Check:
                      </span>{" "}
                      <span className="text-muted-foreground">{agent.verify}</span>
                    </p>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </section>

          <section className="rack-panel overflow-hidden">
            <SectionHeading
              number="03"
              title="Use it"
              detail="Create your first episode in plain language."
            />
            <div className="p-4 sm:p-5">
              <p className="text-sm leading-6 text-muted-foreground">
                Ask your agent in plain language, or use the built-in prompts{" "}
                <code className="font-mono text-foreground">pr-roast-podcast</code> and{" "}
                <code className="font-mono text-foreground">incident-postmortem-war-room</code>.
              </p>
              <CodeBlock
                code={`Use the studio-engineer tools to make a short 2-host podcast roasting this PR:
"Removed all retries from the payment client to cut latency."
Alternate Alex and Sam, add one interruption (negative overlap_ms),
a record_scratch SFX, then render_master_mix at -16 LUFS.`}
              />
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                The finished episode is saved to{" "}
                <code className="font-mono text-foreground">
                  mcp-server/renders/&lt;session_id&gt;/master.mp3
                </code>
                .
              </p>
            </div>
          </section>

          <section className="rack-panel overflow-hidden">
            <SectionHeading
              number="04"
              title="Optional"
              detail="Validation, alternate voices, and troubleshooting."
            />
            <div className="space-y-4 p-4 text-sm sm:p-5">
              <div className="rounded-md border border-border bg-background/40 p-4">
                <p className="font-medium text-foreground">Development validation</p>
                <p className="mt-1 leading-6 text-muted-foreground">
                  Optional after connection: install the test dependency and run the deterministic
                  offline suite.
                </p>
                <CodeBlock code={UV_DEV_VALIDATION} />
                <p className="mt-3 leading-6 text-muted-foreground">
                  If Kokoro is installed, include both extras so validation preserves it:
                </p>
                <CodeBlock code={UV_DEV_VALIDATION_KOKORO} />
              </div>
              <div className="rounded-md border border-border bg-background/40 p-4">
                <p className="flex items-center gap-2 font-medium text-foreground">
                  <Terminal className="size-4 text-primary" /> Test without an agent (MCP Inspector,
                  needs Node.js)
                </p>
                <CodeBlock
                  code={`npx @modelcontextprotocol/inspector uv --directory "${dir.trim() || SAMPLE_DIR[os]}" run --no-sync python -m src.server`}
                />
              </div>
              <div className="rounded-md border border-border bg-background/40 p-4">
                <p className="font-medium text-foreground">Real voices</p>
                <p className="mt-1 leading-6 text-muted-foreground">
                  The configs use <code className="font-mono">edge</code>: free neural voices that
                  send generated dialogue text to Microsoft (no API key). Override the cast with{" "}
                  <code className="font-mono">TTS_VOICE_ALEX</code> and{" "}
                  <code className="font-mono">TTS_VOICE_SAM</code>. For ElevenLabs set{" "}
                  <code className="font-mono">TTS_PROVIDER=elevenlabs</code> and{" "}
                  <code className="font-mono">ELEVENLABS_API_KEY</code> in the env block; its
                  service receives generated dialogue text. For local Kokoro speech install its
                  locked extra, download <code className="font-mono">kokoro-v1.0.onnx</code> and{" "}
                  <code className="font-mono">voices-v1.0.bin</code> into mcp-server, and set{" "}
                  <code className="font-mono">TTS_PROVIDER=kokoro</code> with its model paths.
                </p>
                <CodeBlock code={UV_SYNC_KOKORO} />
              </div>
              <div className="rounded-md border border-border bg-background/40 p-4">
                <p className="font-medium text-foreground">Troubleshooting</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 leading-6 text-muted-foreground">
                  <li>
                    <b>"uv" not found</b> — GUI apps may not see your shell PATH. Replace{" "}
                    <code className="font-mono">"uv"</code> with its full path (
                    {os === "windows" ? "where.exe uv" : "which uv"}).
                  </li>
                  <li>
                    <b>Render fails</b> — run <code className="font-mono">ffmpeg -version</code>;
                    reinstall FFmpeg and restart the agent.
                  </li>
                  <li>
                    <b>Server not listed</b> — check the JSON is valid, the path is absolute, then
                    fully restart the agent.
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
