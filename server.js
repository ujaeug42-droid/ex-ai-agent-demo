const http = require("http");
const https = require("https");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");

const root = __dirname;

// Dependency-free secret loader. Keeps the API key out of code, git, and chat.
// Priority: real environment var → .env.local / .env (KEY=VALUE) → API_KEY.txt (raw key only).
(function loadEnvFiles() {
  for (const fileName of [".env.local", ".env"]) {
    let text;
    try {
      text = fs.readFileSync(path.join(root, fileName), "utf8");
    } catch {
      continue;
    }
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key && !(key in process.env)) process.env[key] = value;
    }
  }
  // Easiest path for non-developers: a plain text file containing just the key.
  if (!process.env.ANTHROPIC_API_KEY) {
    for (const fileName of ["API_KEY.txt", "api-key.txt"]) {
      let text;
      try {
        text = fs.readFileSync(path.join(root, fileName), "utf8");
      } catch {
        continue;
      }
      const candidate = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .find((l) => l.startsWith("sk-ant-"));
      if (candidate) {
        process.env.ANTHROPIC_API_KEY = candidate;
        break;
      }
    }
  }
})();

const dataRoot = path.join(root, "data");
const projectsRoot = path.join(dataRoot, "projects");
const uploadsRoot = path.join(dataRoot, "uploads");
// Bind 0.0.0.0 when a platform provides PORT (Render/Railway/Fly); 127.0.0.1 for local dev.
const host = process.env.HOST || (process.env.PORT ? "0.0.0.0" : "127.0.0.1");
const port = Number(process.env.PORT || 8765);

const APP_VERSION = "1.0.0";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

// Lightweight abuse guard for the public AI endpoint: caps per-IP burst and total daily calls
// so an exposed URL can't drain the API key. The real safety net is a spend limit in the
// Anthropic console — this just bounds worst case.
const AI_RATE = {
  perIpMax: Number(process.env.AI_PER_IP_MAX || 12), // requests
  perIpWindowMs: 5 * 60 * 1000, // per 5 minutes
  dailyMax: Number(process.env.AI_DAILY_MAX || 300), // total/day
  ipHits: new Map(),
  dayStamp: "",
  dayCount: 0,
};

function checkAiRateLimit(ip) {
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  if (AI_RATE.dayStamp !== today) {
    AI_RATE.dayStamp = today;
    AI_RATE.dayCount = 0;
  }
  if (AI_RATE.dayCount >= AI_RATE.dailyMax) {
    return { ok: false, reason: "오늘 분석 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요." };
  }
  const hits = (AI_RATE.ipHits.get(ip) || []).filter((t) => now - t < AI_RATE.perIpWindowMs);
  if (hits.length >= AI_RATE.perIpMax) {
    return { ok: false, reason: "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요." };
  }
  hits.push(now);
  AI_RATE.ipHits.set(ip, hits);
  AI_RATE.dayCount += 1;
  return { ok: true };
}

// Stable system prompt — kept byte-identical across requests so prompt caching hits.
const AI_SYSTEM_PROMPT = `당신은 전시 공간 기획 전문가이자 관람 동선 분석가입니다.
EX_AI Agent 시뮬레이션이 산출한 JSON 데이터를 해석해 전시 기획자에게 실무 제안을 제공합니다.

[입력 데이터 구조]
- spaceType: 공간 유형(미술관/박물관/과학관 등)
- visitors: 가정 관람객 수
- personas: 페르소나별 비율과 선호 콘텐츠
- contents: 콘텐츠 목록(id, 이름, 유형, 면적, 체류시간, 예상방문, 혼잡지수)
- matrix: 콘텐츠별 페르소나 기여도(%)와 권고
- bottlenecks: 혼잡 상위 콘텐츠

[작성 원칙]
1. 한국어로, 전시 실무자가 바로 실행할 수 있는 구체적 제안을 한다.
2. 혼잡지수가 높은 콘텐츠는 "왜 막히는지(체류시간×면적×페르소나)"를 근거로 설명한다. 근거 수치는 괄호로 짧게 붙인다.
3. 동선·배치·연출 관점에서 개선안을 제시한다.
4. 추측성 수치를 새로 만들지 않는다. 주어진 데이터 안에서만 해석한다.
5. 사용자의 추가 질문(prompt)이 있으면 그 관점을 우선 반영한다.
6. 마크다운 헤더(#)를 쓰지 않는다. 짧은 문단과 불릿(-)만 사용한다. 군더더기 없이 요점만 쓴다.`;

const FAST_INSTRUCTION = "\n\n[출력 형식] 한 줄 요약 1문장 + 개선안 정확히 3개(각 1~2문장, 근거 수치 괄호). 전체 250자 이내로 매우 간결하게.";
const DEEP_INSTRUCTION = "\n\n[출력 형식] 병목 진단 + 개선안 4~5개(각 근거 데이터 포함). 실무 보고서 수준으로 상세히.";

function callClaudeAnalyze(payload, apiKey) {
  const userQuestion = typeof payload.prompt === "string" && payload.prompt.trim()
    ? payload.prompt.trim()
    : "이 전시의 병목 원인과 공간 개선 방향을 제안해줘.";

  // "fast" = 빠른 분석(sonnet, 낮은 effort, 짧게), "deep" = 정밀 분석(opus, medium effort, 상세).
  const mode = payload.mode === "deep" ? "deep" : "fast";
  const model = process.env.ANTHROPIC_MODEL
    || (mode === "deep" ? "claude-opus-4-8" : "claude-sonnet-4-6");
  const effort = mode === "deep" ? "medium" : "low";
  const maxTokens = mode === "deep" ? 1800 : 600;
  const formatInstruction = mode === "deep" ? DEEP_INSTRUCTION : FAST_INSTRUCTION;

  const requestBody = JSON.stringify({
    model,
    max_tokens: maxTokens,
    thinking: { type: "adaptive" },
    output_config: { effort },
    // Cache the large, stable system prompt; the volatile data goes in messages.
    system: [
      { type: "text", text: AI_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    messages: [
      {
        role: "user",
        content: `다음은 전시 시뮬레이션 결과입니다.\n\n\`\`\`json\n${JSON.stringify(payload.analysis ?? payload, null, 2)}\n\`\`\`\n\n요청: ${userQuestion}${formatInstruction}`,
      },
    ],
  });

  const options = {
    hostname: "api.anthropic.com",
    path: "/v1/messages",
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-length": Buffer.byteLength(requestBody),
    },
    timeout: 60000,
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        let json;
        try {
          json = JSON.parse(raw);
        } catch {
          reject(new Error(`Claude API 응답을 해석하지 못했습니다 (HTTP ${res.statusCode}).`));
          return;
        }
        if (res.statusCode !== 200) {
          const message = json?.error?.message || `Claude API 오류 (HTTP ${res.statusCode})`;
          const error = new Error(message);
          error.statusCode = res.statusCode === 401 || res.statusCode === 403 ? 502 : 502;
          reject(error);
          return;
        }
        const text = Array.isArray(json.content)
          ? json.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim()
          : "";
        resolve({
          text,
          model: json.model || ANTHROPIC_MODEL,
          usage: json.usage || null,
        });
      });
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("Claude API 요청이 시간 초과되었습니다."));
    });
    req.write(requestBody);
    req.end();
  });
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".dxf": "application/dxf",
};

async function ensureDataDirs() {
  await fsp.mkdir(projectsRoot, { recursive: true });
  await fsp.mkdir(uploadsRoot, { recursive: true });
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body, null, 2));
}

function sendText(response, statusCode, body) {
  response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(body);
}

function safeProjectName(name) {
  return String(name || "project")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 120);
}

async function readJsonBody(request, maxBytes = 10 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new Error("Request body is too large");
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

async function readBinaryBody(request, maxBytes = 150 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new Error("Uploaded file is too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function pathExists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    try {
      fs.accessSync(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}

function findCommand(names) {
  const envPath = process.env.PATH || process.env.Path || "";
  const pathDirs = envPath.split(path.delimiter).filter(Boolean);
  const extensions = process.platform === "win32" ? ["", ".exe", ".cmd", ".bat"] : [""];
  for (const dir of pathDirs) {
    for (const name of names) {
      for (const ext of extensions) {
        const candidate = path.join(dir, name.endsWith(ext) ? name : `${name}${ext}`);
        if (pathExists(candidate)) return candidate;
      }
    }
  }
  return null;
}

function findOdaConverter() {
  if (process.env.DWG_CONVERTER_PATH && pathExists(process.env.DWG_CONVERTER_PATH)) {
    return process.env.DWG_CONVERTER_PATH;
  }

  const fromPath = findCommand(["ODAFileConverter", "ODAFileConverter.exe"]);
  if (fromPath) return fromPath;

  if (process.platform !== "win32") return null;

  const bases = [process.env.ProgramFiles, process.env["ProgramFiles(x86)"]].filter(Boolean);
  const directNames = [
    "ODAFileConverter.exe",
    path.join("ODAFileConverter", "ODAFileConverter.exe"),
    path.join("Open Design Alliance", "ODAFileConverter", "ODAFileConverter.exe"),
  ];
  for (const base of bases) {
    for (const name of directNames) {
      const candidate = path.join(base, name);
      if (pathExists(candidate)) return candidate;
    }
  }
  return null;
}

function findDwgConverter() {
  const dwgread = findCommand(["dwgread", "dwgread.exe"]);
  if (dwgread) return { kind: "dwgread", command: dwgread };

  const dwg2dxf = findCommand(["dwg2dxf", "dwg2dxf.exe"]);
  if (dwg2dxf) return { kind: "dwg2dxf", command: dwg2dxf };

  const oda = findOdaConverter();
  if (oda) return { kind: "oda", command: oda };

  return null;
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || root,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr || stdout || `${path.basename(command)} exited with ${code}`));
    });
  });
}

async function findFirstDxf(dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await findFirstDxf(filePath);
      if (nested) return nested;
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".dxf")) {
      return filePath;
    }
  }
  return null;
}

async function convertDwgToDxf(inputFile, workDir) {
  const converter = findDwgConverter();
  if (!converter) {
    const error = new Error("DWG 변환기가 서버에 설치되어 있지 않습니다. LibreDWG(dwgread/dwg2dxf) 또는 ODA File Converter를 설치한 뒤 서버를 다시 시작해주세요.");
    error.statusCode = 501;
    throw error;
  }

  const outputFile = path.join(workDir, `${path.parse(inputFile).name}.dxf`);
  const outputDir = path.join(workDir, "out");
  await fsp.mkdir(outputDir, { recursive: true });

  if (converter.kind === "dwgread") {
    await runProcess(converter.command, ["-O", "DXF", "-o", outputFile, inputFile], { cwd: workDir });
    return { converter: "LibreDWG dwgread", outputFile };
  }

  if (converter.kind === "dwg2dxf") {
    await runProcess(converter.command, ["--overwrite", inputFile], { cwd: workDir });
    const generated = await findFirstDxf(workDir);
    if (!generated) throw new Error("dwg2dxf 변환 결과 DXF 파일을 찾지 못했습니다.");
    return { converter: "LibreDWG dwg2dxf", outputFile: generated };
  }

  await runProcess(converter.command, [workDir, outputDir, "ACAD2018", "DXF", "0", "1", "*.dwg"], { cwd: workDir });
  const generated = await findFirstDxf(outputDir);
  if (!generated) throw new Error("ODA File Converter 변환 결과 DXF 파일을 찾지 못했습니다.");
  return { converter: "ODA File Converter", outputFile: generated };
}

async function listProjects() {
  await ensureDataDirs();
  const files = await fsp.readdir(projectsRoot, { withFileTypes: true });
  const projects = [];
  for (const file of files) {
    if (!file.isFile() || !file.name.endsWith(".exc")) continue;
    const filePath = path.join(projectsRoot, file.name);
    const stats = await fsp.stat(filePath);
    projects.push({
      name: file.name,
      size: stats.size,
      updatedAt: stats.mtime.toISOString(),
    });
  }
  return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function handleApi(request, response, url) {
  if (url.pathname === "/api/health" && request.method === "GET") {
    sendJson(response, 200, {
      ok: true,
      app: "EX_AI Agent PRO",
      version: APP_VERSION,
      aiEnabled: Boolean(process.env.ANTHROPIC_API_KEY),
      time: new Date().toISOString(),
    });
    return true;
  }

  if (url.pathname === "/api/ai/analyze" && request.method === "POST") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      sendJson(response, 501, {
        ok: false,
        error: "AI 분석이 설정되지 않았습니다. 서버에 ANTHROPIC_API_KEY 환경변수를 설정한 뒤 다시 시작해주세요.",
        fallback: true,
      });
      return true;
    }
    const clientIp = (request.headers["x-forwarded-for"] || "").split(",")[0].trim()
      || request.socket.remoteAddress || "unknown";
    const gate = checkAiRateLimit(clientIp);
    if (!gate.ok) {
      sendJson(response, 429, { ok: false, error: gate.reason, fallback: true });
      return true;
    }
    try {
      const body = await readJsonBody(request);
      const result = await callClaudeAnalyze(body, apiKey);
      sendJson(response, 200, {
        ok: true,
        model: result.model,
        analysis: result.text,
        usage: result.usage,
      });
    } catch (error) {
      sendJson(response, error.statusCode || 500, {
        ok: false,
        error: error.message || "AI 분석에 실패했습니다.",
        fallback: true,
      });
    }
    return true;
  }

  if (url.pathname === "/api/projects" && request.method === "GET") {
    sendJson(response, 200, { projects: await listProjects() });
    return true;
  }

  if (url.pathname === "/api/dwg/convert" && request.method === "POST") {
    const originalName = safeProjectName(request.headers["x-file-name"] || `drawing_${Date.now()}.dwg`);
    const fileName = originalName.toLowerCase().endsWith(".dwg") ? originalName : `${originalName}.dwg`;
    const workDir = await fsp.mkdtemp(path.join(uploadsRoot, "dwg-"));
    const inputFile = path.join(workDir, fileName);
    try {
      const fileBuffer = await readBinaryBody(request);
      await fsp.writeFile(inputFile, fileBuffer);
      const result = await convertDwgToDxf(inputFile, workDir);
      const dxfText = await fsp.readFile(result.outputFile, "utf8");
      sendJson(response, 200, {
        ok: true,
        converter: result.converter,
        fileName: path.basename(result.outputFile),
        dxfText,
      });
    } catch (error) {
      sendJson(response, error.statusCode || 500, {
        ok: false,
        error: error.message || "DWG conversion failed",
      });
    } finally {
      fsp.rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
    return true;
  }

  if (url.pathname === "/api/projects" && request.method === "POST") {
    const body = await readJsonBody(request);
    const name = safeProjectName(body.name || body.projectName || `project_${Date.now()}`);
    const fileName = name.endsWith(".exc") ? name : `${name}.exc`;
    const payload = body.project || body;
    const filePath = path.join(projectsRoot, fileName);
    await ensureDataDirs();
    await fsp.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
    sendJson(response, 201, { ok: true, name: fileName });
    return true;
  }

  if (url.pathname.startsWith("/api/projects/") && request.method === "GET") {
    const name = safeProjectName(decodeURIComponent(url.pathname.replace("/api/projects/", "")));
    const fileName = name.endsWith(".exc") ? name : `${name}.exc`;
    const filePath = path.join(projectsRoot, fileName);
    if (!filePath.startsWith(projectsRoot)) {
      sendJson(response, 403, { error: "Forbidden" });
      return true;
    }
    try {
      const text = await fsp.readFile(filePath, "utf8");
      response.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      response.end(text);
    } catch {
      sendJson(response, 404, { error: "Project not found" });
    }
    return true;
  }

  return false;
}

async function serveStatic(request, response, url) {
  const cleanPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.normalize(path.join(root, cleanPath));
  if (!filePath.startsWith(root) || filePath.startsWith(dataRoot)) {
    sendText(response, 403, "Forbidden");
    return;
  }

  try {
    const stats = await fsp.stat(filePath);
    if (stats.isDirectory()) {
      sendText(response, 403, "Forbidden");
      return;
    }
    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Content-Length": stats.size,
      "Cache-Control": "no-store",
    });
    fs.createReadStream(filePath).pipe(response);
  } catch {
    sendText(response, 404, "Not found");
  }
}

async function handleRequest(request, response) {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname.startsWith("/api/")) {
      const handled = await handleApi(request, response, url);
      if (handled) return;
      sendJson(response, 404, { error: "API route not found" });
      return;
    }
    await serveStatic(request, response, url);
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Internal server error" });
  }
}

ensureDataDirs()
  .then(() => {
    http.createServer(handleRequest).listen(port, host, () => {
      console.log(`EX_AI Agent PRO v${APP_VERSION} running at http://${host}:${port}`);
      console.log(`Project API ready at http://${host}:${port}/api/projects`);
      console.log(`AI 분석: ${process.env.ANTHROPIC_API_KEY ? `사용 가능 (모델 ${ANTHROPIC_MODEL})` : "비활성 (ANTHROPIC_API_KEY 미설정 — 로컬 분석으로 대체)"}`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
