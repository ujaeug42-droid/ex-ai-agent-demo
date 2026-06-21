const SPACE_TYPE_PRESETS = {
  "박물관": { Explorer: 15, Influencer: 15, Seeker: 40, Relaxer: 30, note: "학습·교육 중심 — 중장년·노년 비중 高" },
  "미술관": { Explorer: 10, Influencer: 30, Seeker: 40, Relaxer: 20, note: "감상·정보형 — 청년·중장년 균형" },
  "과학관": { Explorer: 40, Influencer: 25, Seeker: 25, Relaxer: 10, note: "체험 중심 — 어린이 압도적" },
  "컨벤션": { Explorer: 5, Influencer: 35, Seeker: 50, Relaxer: 10, note: "비즈니스·정보 — 중장년·청년" },
  "상업공간": { Explorer: 15, Influencer: 50, Seeker: 25, Relaxer: 10, note: "쇼핑·SNS — 청년 우세" },
  "이벤트공간": { Explorer: 30, Influencer: 40, Seeker: 20, Relaxer: 10, note: "팝업·체험 — 어린이·청년" },
};

const PERSONAS = [
  {
    key: "Explorer",
    label: "어린이",
    role: "예측 불가 · 체험물 선호 · 자유 동선",
    color: "#2b8cbe",
    weight: 25,
    prefers: ["Interactive", "Kiosk", "Diorama"],
    speed: 1.18,
  },
  {
    key: "Influencer",
    label: "청년층",
    role: "인증샷 · 포토존 체류 · SNS 경험 민감",
    color: "#f03b20",
    weight: 25,
    prefers: ["Realistic Media", "Monitor Media", "Interactive"],
    speed: 1,
  },
  {
    key: "Seeker",
    label: "중장년층",
    role: "정보습득 · 안정적 주동선 · 텍스트 선호",
    color: "#31a354",
    weight: 30,
    prefers: ["Panel", "Showcase", "Diorama"],
    speed: 0.86,
  },
  {
    key: "Relaxer",
    label: "노년층",
    role: "느린 이동 · 휴식 공간 선호",
    color: "#756bb1",
    weight: 20,
    prefers: ["Showcase", "Panel", "Diorama"],
    speed: 0.68,
  },
];

const CONTENT_TYPES = [
  { key: "Panel", label: "Panel", min: 0.5, max: 1, value: 0.8, color: "#111827" },
  { key: "Monitor Media", label: "Monitor Media", min: 1, max: 3, value: 1.7, color: "#111827" },
  { key: "Realistic Media", label: "Realistic Media", min: 1, max: 10, value: 5.5, color: "#111827" },
  { key: "Diorama", label: "Diorama", min: 1, max: 2, value: 1.4, color: "#111827" },
  { key: "Showcase", label: "Showcase", min: 0.75, max: 1.5, value: 1.1, color: "#111827" },
  { key: "Kiosk", label: "Kiosk", min: 2, max: 4, value: 3, color: "#111827" },
  { key: "Interactive", label: "Interactive", min: 3, max: 5, value: 4.2, color: "#111827" },
];

const CONTENT_TYPE_KO = {
  Panel: "패널",
  "Monitor Media": "영상",
  "Realistic Media": "실감미디어",
  Diorama: "디오라마",
  Showcase: "진열장",
  Kiosk: "키오스크",
  Interactive: "체험존",
};

const LAYER_STYLE = {
  Wall: { label: "Wall 벽체", color: "#8f9694", lineWidth: 3 },
  Panel: { label: "Panel 패널", color: "#111827", lineWidth: 2 },
  "Monitor Media": { label: "Media 영상", color: "#111827", lineWidth: 2 },
  "Realistic Media": { label: "Media 실감형", color: "#111827", lineWidth: 2 },
  Diorama: { label: "Diorama 모형", color: "#111827", lineWidth: 2 },
  Showcase: { label: "Showcase 진열장", color: "#111827", lineWidth: 2 },
  Kiosk: { label: "Kiosk 키오스크", color: "#111827", lineWidth: 2 },
  Interactive: { label: "Interactive 반응형", color: "#111827", lineWidth: 2 },
  Annotation: { label: "Annotation 문자", color: "#7f8a8d", lineWidth: 1 },
  Door: { label: "Door 문", color: "#64748b", lineWidth: 1 },
  Window: { label: "Window 창문", color: "#64748b", lineWidth: 1 },
  Furniture: { label: "Furniture 가구", color: "#4b5563", lineWidth: 1 },
  Ignored: { label: "분석 제외", color: "#c4c9c7", lineWidth: 1 },
  Other: { label: "Other", color: "#5b6770", lineWidth: 1 },
};

const LAYER_CATEGORY_OPTIONS = [
  "Wall",
  "Panel",
  "Monitor Media",
  "Realistic Media",
  "Diorama",
  "Showcase",
  "Kiosk",
  "Interactive",
  "Annotation",
  "Door",
  "Window",
  "Furniture",
  "Ignored",
  "Other",
];

const state = {
  projectName: "sample_gallery",
  spaceType: "미술관",
  unit: { label: "m", scale: 1, normalized: false, inferred: false },
  visitors: 12000,
  entities: [],
  contents: [],
  layers: new Map(),
  bounds: null,
  personas: structuredClone(PERSONAS),
  durations: structuredClone(CONTENT_TYPES),
  activePersonas: new Set(PERSONAS.map((persona) => persona.key)),
  filters: { heat: true, paths: true, contours: true, labels: true },
  mode: "analysis",
  hoveredContent: null,
  selectedEntityIndex: null,
  entityOverrides: {},
  routePickMode: null,
  entrancePoint: null,
  exitPoint: null,
  view: {
    mode: "auto",
    bounds: null,
    zoom: 1,
    panX: 0,
    panY: 0,
    panning: false,
    didDrag: false,
    lastX: 0,
    lastY: 0,
  },
};

const canvas = document.getElementById("planCanvas");
const ctx = canvas.getContext("2d");
const thumbCanvas = document.getElementById("thumbCanvas");
const thumbCtx = thumbCanvas.getContext("2d");
const tooltip = document.getElementById("tooltip");

const formatNumber = new Intl.NumberFormat("ko-KR");

function init() {
  buildSamplePlan();
  bindControls();
  renderEditors();
  updateAll();
}

function buildSamplePlan() {
  const e = [];
  const wall = "A-WALL";
  const panel = "EX-PANEL";
  const media = "EX-MEDIA";
  const realistic = "EX-REALISTIC-MEDIA";
  const diorama = "EX-DIORAMA";
  const showcase = "EX-SHOWCASE";
  const kiosk = "EX-KIOSK";
  const interactive = "EX-INTERACTIVE";

  e.push(poly(wall, [[0, 0], [42, 0], [42, 28], [0, 28]], true));
  e.push(line(wall, 9, 0, 9, 9));
  e.push(line(wall, 9, 14, 9, 28));
  e.push(line(wall, 20, 0, 20, 7));
  e.push(line(wall, 20, 12, 20, 28));
  e.push(line(wall, 31, 0, 31, 10));
  e.push(line(wall, 31, 16, 31, 28));
  e.push(line(wall, 0, 14, 6, 14));
  e.push(line(wall, 13, 14, 26, 14));
  e.push(line(wall, 34, 14, 42, 14));

  e.push(rect(panel, 4, 5, 3, 0.5, "Origins Panel"));
  e.push(rect(panel, 15, 4, 4, 0.5, "Timeline Panel"));
  e.push(rect(media, 24, 4, 4, 1.2, "Immersive Monitor"));
  e.push(rect(realistic, 34, 5, 5, 3.5, "Realistic Media Theater"));
  e.push(rect(diorama, 5, 20, 3.8, 2, "City Diorama"));
  e.push(rect(showcase, 15, 20, 4.5, 1.8, "Archive Showcase"));
  e.push(rect(kiosk, 25, 20, 2.2, 2.2, "Research Kiosk"));
  e.push(rect(interactive, 35, 20, 3.8, 3, "Interactive Table"));
  e.push(rect(panel, 6.5, 12, 2, 0.5, "Orientation Panel"));
  e.push(rect(showcase, 28, 12, 3.5, 1.5, "Focus Showcase"));
  e.push(rect(media, 37, 12, 3, 1, "Short Media Loop"));
  e.push(rect(interactive, 17.5, 11, 2.5, 2.4, "Hands-on Station"));

  state.entities = e;
  state.projectName = "sample_gallery";
  state.unit = { label: "m", scale: 1, normalized: false, inferred: false };
  deriveContentsFromEntities();
  computeLayers();
}

function line(layer, x1, y1, x2, y2) {
  return { type: "LINE", layer, points: [{ x: x1, y: y1 }, { x: x2, y: y2 }] };
}

function poly(layer, points, closed = false, name = "") {
  return { type: "POLYLINE", layer, points: points.map(([x, y]) => ({ x, y })), closed, name };
}

function rect(layer, x, y, w, h, name) {
  return poly(layer, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], true, name);
}

function bindControls() {
  window.addEventListener("resize", updateAll);
  document.getElementById("dxfInput").addEventListener("change", handleDxfImport);
  document.getElementById("projectInput").addEventListener("change", handleProjectImport);
  document.getElementById("thumbnailToggle").addEventListener("change", (event) => {
    document.getElementById("thumbnailBox").hidden = !event.target.checked;
  });
  document.getElementById("spaceType").addEventListener("change", (event) => {
    state.spaceType = event.target.value;
    applySpaceTypePreset(state.spaceType);
    updateAll();
  });
  document.getElementById("visitorSlider").addEventListener("input", (event) => {
    state.visitors = Number(event.target.value);
    document.getElementById("visitorValue").textContent = `${formatNumber.format(state.visitors)}명`;
    updateAll();
  });
  document.getElementById("autoLayerButton").addEventListener("click", () => {
    computeLayers();
    deriveContentsFromEntities();
    resetAutoView();
    updateAll();
  });
  document.getElementById("applyEntityCategory").addEventListener("click", applySelectedEntityCategory);
  document.getElementById("applyLayerCategory").addEventListener("click", applySelectedLayerCategory);
  document.getElementById("fitViewButton").addEventListener("click", () => fitViewToBounds(computeVisibleBounds(state.entities)));
  document.getElementById("fitSelectionButton").addEventListener("click", fitViewToSelection);
  document.getElementById("autoContentButton").addEventListener("click", autoAssignContentCandidates);
  document.getElementById("setEntranceButton").addEventListener("click", () => setRoutePickMode("entrance"));
  document.getElementById("setExitButton").addEventListener("click", () => setRoutePickMode("exit"));
  document.getElementById("togglePanelsButton").addEventListener("click", togglePanels);
  document.querySelectorAll(".view-filter").forEach((input) => {
    input.addEventListener("change", () => {
      state.filters[input.dataset.filter] = input.checked;
      draw();
    });
  });
  document.querySelectorAll(".persona-filter").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) state.activePersonas.add(input.value);
      else state.activePersonas.delete(input.value);
      updateAll();
    });
  });
  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-mode]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.mode = button.dataset.mode;
      draw();
    });
  });
  canvas.addEventListener("click", handleCanvasClick);
  canvas.addEventListener("wheel", handleCanvasWheel, { passive: false });
  canvas.addEventListener("mousedown", handleCanvasMouseDown);
  window.addEventListener("mousemove", handleCanvasPanMove);
  window.addEventListener("mouseup", endCanvasPan);
  canvas.addEventListener("mousemove", handleCanvasMove);
  canvas.addEventListener("mouseleave", () => {
    tooltip.hidden = true;
    state.hoveredContent = null;
    draw();
  });
  document.getElementById("saveProject").addEventListener("click", exportProject);
  document.getElementById("exportCsv").addEventListener("click", exportCsv);
  document.getElementById("exportPng").addEventListener("click", exportPng);
  document.getElementById("exportPdf").addEventListener("click", exportPdf);
  document.getElementById("aboutButton").addEventListener("click", () => document.getElementById("aboutDialog").showModal());
  document.getElementById("askAgent").addEventListener("click", requestAiAnalysis);
}

function renderEditors() {
  renderEntityCategoryOptions();
  const personaEditor = document.getElementById("personaEditor");
  personaEditor.innerHTML = "";
  state.personas.forEach((persona, index) => {
    const row = document.createElement("div");
    row.className = "persona-row";
    row.innerHTML = `
      <div>
        <div class="persona-chip">
          <span class="persona-dot" style="background:${persona.color}"></span>
          <span class="persona-name">${persona.label}(${persona.key})</span>
        </div>
        <div class="persona-role">${persona.role}</div>
      </div>
      <span class="persona-percent" id="personaPercent-${persona.key}">${persona.weight}%</span>
      <input type="range" min="0" max="100" step="1" value="${persona.weight}" aria-label="${persona.label} 비율">
    `;
    row.querySelector("input").addEventListener("input", (event) => adjustPersona(index, Number(event.target.value)));
    personaEditor.appendChild(row);
  });

  const durationEditor = document.getElementById("durationEditor");
  durationEditor.innerHTML = "";
  state.durations.forEach((duration) => {
    const row = document.createElement("div");
    row.className = "duration-row";
    row.innerHTML = `
      <label>${duration.label}<small>${duration.min}분 ~ ${duration.max}분</small></label>
      <span class="duration-value" id="durationValue-${cssKey(duration.key)}">${duration.value.toFixed(1)}분</span>
      <input type="range" min="${duration.min}" max="${duration.max}" step="0.1" value="${duration.value}" aria-label="${duration.label} 체류시간">
    `;
    row.querySelector("input").addEventListener("input", (event) => {
      duration.value = Number(event.target.value);
      document.getElementById(`durationValue-${cssKey(duration.key)}`).textContent = `${duration.value.toFixed(1)}분`;
      updateAll();
    });
    durationEditor.appendChild(row);
  });
}

function renderEntityCategoryOptions() {
  const select = document.getElementById("entityCategorySelect");
  if (!select || select.options.length) return;
  select.innerHTML = LAYER_CATEGORY_OPTIONS.map((category) => {
    const label = LAYER_STYLE[category]?.label || category;
    return `<option value="${category}">${label}</option>`;
  }).join("");
}

function cssKey(key) {
  return key.replaceAll(" ", "-");
}

function applySpaceTypePreset(spaceType) {
  const preset = SPACE_TYPE_PRESETS[spaceType];
  if (!preset) return;
  state.personas.forEach((persona) => {
    if (Number.isFinite(preset[persona.key])) persona.weight = preset[persona.key];
  });
  renderEditors();
}

function adjustPersona(changedIndex, newValue) {
  const personas = state.personas;
  const previous = personas[changedIndex].weight;
  const delta = newValue - previous;
  personas[changedIndex].weight = newValue;
  const others = personas.filter((_, index) => index !== changedIndex);
  const otherTotal = others.reduce((sum, persona) => sum + persona.weight, 0);

  if (otherTotal === 0) {
    const share = (100 - newValue) / others.length;
    others.forEach((persona) => persona.weight = Math.max(0, Math.round(share)));
  } else {
    others.forEach((persona) => {
      persona.weight = Math.max(0, persona.weight - delta * (persona.weight / otherTotal));
    });
  }

  const rounded = personas.map((persona) => Math.round(persona.weight));
  const diff = 100 - rounded.reduce((sum, value) => sum + value, 0);
  rounded[changedIndex] += diff;
  personas.forEach((persona, index) => {
    persona.weight = Math.max(0, Math.min(100, rounded[index]));
  });

  [...document.querySelectorAll(".persona-row input")].forEach((input, index) => {
    input.value = personas[index].weight;
  });
  personas.forEach((persona) => {
    document.getElementById(`personaPercent-${persona.key}`).textContent = `${persona.weight}%`;
  });
  updateAll();
}

async function handleDxfImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  const isDwg = file.name.toLowerCase().endsWith(".dwg");
  const buffer = await file.arrayBuffer();
  const text = isDwg ? await convertDwgFile(file, buffer) : decodeDxfBuffer(buffer);
  if (!text) return;
  const parsed = parseDxf(text);
  if (!parsed.length) {
    alert("지원되는 DXF 엔티티를 찾지 못했습니다. ASCII DXF로 저장했는지 확인해주세요. BLOCK/INSERT, LINE, POLYLINE, HATCH, SPLINE, ELLIPSE, CIRCLE, ARC, TEXT를 우선 지원합니다.");
    return;
  }
  const normalized = normalizeEntitiesToMeters(parsed, detectDxfUnit(text, parsed));
  state.entities = normalized.entities;
  state.unit = normalized.unit;
  state.entityOverrides = {};
  state.selectedEntityIndex = null;
  state.entrancePoint = null;
  state.exitPoint = null;
  state.routePickMode = null;
  resetAutoView();
  state.projectName = file.name.replace(/\.(dxf|dwg)$/i, "");
  deriveContentsFromEntities();
  computeLayers();
  if (state.contents.length === 0) {
    autoAssignContentCandidates({ silent: true });
  }
  updateAll();
}

async function convertDwgFile(file, buffer) {
  try {
    const response = await fetch("/api/dwg/convert", {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-File-Name": encodeURIComponent(file.name),
      },
      body: buffer,
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || "DWG 변환에 실패했습니다.");
    }
    return result.dxfText;
  } catch (error) {
    alert(`${error.message}\n\nDWG는 서버에서 DXF로 변환한 뒤 불러옵니다. LibreDWG(dwgread/dwg2dxf) 또는 ODA File Converter 설치가 필요합니다.`);
    return "";
  }
}

function decodeDxfBuffer(buffer) {
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  const badChars = (utf8.match(/\uFFFD/g) || []).length;
  if (badChars < 5) return utf8;

  try {
    return new TextDecoder("euc-kr").decode(buffer);
  } catch {
    return utf8;
  }
}

function detectDxfUnit(text, entities = []) {
  const explicit = dxfUnitFromInsUnits(readDxfInsUnits(text));
  if (explicit) return explicit;
  return inferUnitFromBounds(entities);
}

function readDxfInsUnits(text) {
  const rows = text.replace(/\r/g, "").split("\n").map((lineText) => lineText.trim());
  for (let i = 0; i < rows.length; i += 1) {
    if (rows[i] !== "$INSUNITS") continue;
    for (let cursor = i + 1; cursor < Math.min(rows.length - 1, i + 12); cursor += 2) {
      if (rows[cursor] === "70") return Number.parseInt(rows[cursor + 1], 10);
    }
  }
  return null;
}

function dxfUnitFromInsUnits(code) {
  const units = {
    1: { label: "in", scale: 0.0254 },
    2: { label: "ft", scale: 0.3048 },
    4: { label: "mm", scale: 0.001 },
    5: { label: "cm", scale: 0.01 },
    6: { label: "m", scale: 1 },
    7: { label: "km", scale: 1000 },
    14: { label: "dm", scale: 0.1 },
  };
  if (!units[code]) return null;
  return { code, ...units[code], inferred: false };
}

function inferUnitFromBounds(entities) {
  const bounds = computeBounds(entities);
  const side = Math.max(bounds.width, bounds.height);
  if (side > 1000) return { code: null, label: "mm 추정", scale: 0.001, inferred: true };
  if (side > 120) return { code: null, label: "cm 추정", scale: 0.01, inferred: true };
  return { code: null, label: "m", scale: 1, inferred: true };
}

function normalizeEntitiesToMeters(entities, unit) {
  const scale = unit?.scale || 1;
  if (Math.abs(scale - 1) < 0.0000001) {
    return { entities, unit: { ...unit, scale: 1, normalized: false } };
  }
  return {
    entities: entities.map((entity) => scaleEntity(entity, scale)),
    unit: { ...unit, normalized: true },
  };
}

function scaleEntity(entity, scale) {
  const scaled = structuredClone(entity);
  if (scaled.points) scaled.points = scaled.points.map((point) => scalePoint(point, scale));
  ["x", "y", "cx", "cy", "r", "height"].forEach((key) => {
    if (Number.isFinite(scaled[key])) scaled[key] *= scale;
  });
  return scaled;
}

function scalePoint(point, scale) {
  return { x: point.x * scale, y: point.y * scale };
}

function parseDxf(text) {
  const rows = text.replace(/\r/g, "").split("\n").map((lineText) => lineText.trim());
  const pairs = [];
  for (let i = 0; i < rows.length - 1; i += 2) {
    pairs.push({ code: rows[i], value: rows[i + 1] });
  }

  const blocks = parseDxfBlocks(pairs);
  const entities = [];
  for (let i = 0; i < pairs.length; i += 1) {
    if (pairs[i].code === "0" && pairs[i].value === "SECTION" && pairs[i + 1]?.code === "2") {
      const sectionName = pairs[i + 1].value;
      i += 2;
      if (sectionName !== "ENTITIES") continue;

      while (i < pairs.length) {
        if (pairs[i].code === "0" && pairs[i].value === "ENDSEC") break;
        const parsed = parseDxfEntityAt(pairs, i);
        if (!parsed) {
          i += 1;
          continue;
        }
        if (parsed.entity) {
          entities.push(...expandDxfEntity(parsed.entity, blocks));
        }
        i = Math.max(i + 1, parsed.nextIndex);
      }
    }
  }

  if (entities.length) return entities;

  for (let i = 0; i < pairs.length; i += 1) {
    const parsed = parseDxfEntityAt(pairs, i);
    if (!parsed) continue;
    if (parsed.entity) entities.push(...expandDxfEntity(parsed.entity, blocks));
    i = Math.max(i, parsed.nextIndex - 1);
  }
  return entities;
}

function parseDxfBlocks(pairs) {
  const blocks = new Map();
  for (let i = 0; i < pairs.length; i += 1) {
    if (pairs[i].code === "0" && pairs[i].value === "SECTION" && pairs[i + 1]?.code === "2" && pairs[i + 1].value === "BLOCKS") {
      i += 2;
      while (i < pairs.length) {
        if (pairs[i].code === "0" && pairs[i].value === "ENDSEC") break;
        if (pairs[i].code !== "0" || pairs[i].value !== "BLOCK") {
          i += 1;
          continue;
        }

        const header = readDxfEntityData(pairs, i);
        const blockName = valueOf(header.data, "2");
        const blockEntities = [];
        let cursor = header.nextIndex;
        while (cursor < pairs.length && !(pairs[cursor].code === "0" && pairs[cursor].value === "ENDBLK")) {
          const parsed = parseDxfEntityAt(pairs, cursor);
          if (!parsed) {
            cursor += 1;
            continue;
          }
          if (parsed.entity) blockEntities.push(parsed.entity);
          cursor = Math.max(cursor + 1, parsed.nextIndex);
        }
        if (blockName) {
          blocks.set(blockName, {
            baseX: num(valueOf(header.data, "10")),
            baseY: num(valueOf(header.data, "20")),
            entities: blockEntities,
          });
        }
        i = cursor;
      }
    }
  }
  return blocks;
}

function parseDxfEntityAt(pairs, index) {
  if (pairs[index]?.code !== "0") return null;
  const type = pairs[index].value;
  if (type === "POLYLINE") return parseDxfPolyline(pairs, index);

  const { data, nextIndex } = readDxfEntityData(pairs, index);
  const layer = valueOf(data, "8") || "Other";

  if (type === "LINE") {
    return entityResult({
      type,
      layer,
      points: [
        { x: num(valueOf(data, "10")), y: num(valueOf(data, "20")) },
        { x: num(valueOf(data, "11")), y: num(valueOf(data, "21")) },
      ],
    }, nextIndex);
  }

  if (type === "LWPOLYLINE") {
    const xs = valuesOf(data, "10").map(num);
    const ys = valuesOf(data, "20").map(num);
    const points = xs.map((x, pointIndex) => ({ x, y: ys[pointIndex] ?? 0 }));
    if (points.length > 1) return entityResult({ type: "POLYLINE", layer, points, closed: Boolean(num(valueOf(data, "70")) & 1) }, nextIndex);
  }

  if (type === "HATCH") {
    const xs = valuesOf(data, "10").map(num);
    const ys = valuesOf(data, "20").map(num);
    const rawPoints = xs.map((x, pointIndex) => ({ x, y: ys[pointIndex] ?? 0 }));
    // HATCH code 10/20 mixes boundary path vertices, seed points and pattern base points.
    // Drop leading (0,0)-looking sentinel (seed point) and any point wildly off from the cluster.
    const points = sanitizeHatchPoints(rawPoints);
    if (points.length > 2) return entityResult({ type: "HATCH", layer, points, closed: true }, nextIndex);
  }

  if (type === "CIRCLE") {
    const cx = num(valueOf(data, "10"));
    const cy = num(valueOf(data, "20"));
    const r = Math.max(0.1, num(valueOf(data, "40")));
    return entityResult({ type, layer, cx, cy, r, points: circlePoints(cx, cy, r, 40), closed: true }, nextIndex);
  }

  if (type === "ARC") {
    const cx = num(valueOf(data, "10"));
    const cy = num(valueOf(data, "20"));
    const r = Math.max(0.1, num(valueOf(data, "40")));
    const start = deg(num(valueOf(data, "50")));
    const end = deg(num(valueOf(data, "51")));
    return entityResult({ type, layer, cx, cy, r, points: arcPoints(cx, cy, r, start, end, 32) }, nextIndex);
  }

  if (type === "ELLIPSE") {
    const cx = num(valueOf(data, "10"));
    const cy = num(valueOf(data, "20"));
    const mx = num(valueOf(data, "11"));
    const my = num(valueOf(data, "21"));
    const ratio = Math.max(0.01, num(valueOf(data, "40")) || 1);
    const start = num(valueOf(data, "41"));
    const end = num(valueOf(data, "42")) || Math.PI * 2;
    return entityResult({ type, layer, cx, cy, points: ellipsePoints(cx, cy, mx, my, ratio, start, end, 48), closed: Math.abs(end - start) >= Math.PI * 1.95 }, nextIndex);
  }

  if (type === "SPLINE") {
    const xs = valuesOf(data, "10").map(num);
    const ys = valuesOf(data, "20").map(num);
    const points = xs.map((x, pointIndex) => ({ x, y: ys[pointIndex] ?? 0 }));
    if (points.length > 1) return entityResult({ type, layer, points, closed: false }, nextIndex);
  }

  if (["SOLID", "TRACE", "3DFACE"].includes(type)) {
    const points = [
      { x: num(valueOf(data, "10")), y: num(valueOf(data, "20")) },
      { x: num(valueOf(data, "11")), y: num(valueOf(data, "21")) },
      { x: num(valueOf(data, "12")), y: num(valueOf(data, "22")) },
      { x: num(valueOf(data, "13")), y: num(valueOf(data, "23")) },
    ].filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
    if (points.length > 2) return entityResult({ type, layer, points, closed: true }, nextIndex);
  }

  if (type === "POINT") {
    const x = num(valueOf(data, "10"));
    const y = num(valueOf(data, "20"));
    return entityResult({ type, layer, x, y, points: [{ x, y }] }, nextIndex);
  }

  if (type === "TEXT" || type === "MTEXT") {
    return entityResult({
      type: "TEXT",
      layer,
      x: num(valueOf(data, "10")),
      y: num(valueOf(data, "20")),
      text: valueOf(data, "1") || valueOf(data, "3") || "",
      height: num(valueOf(data, "40")) || 0.5,
    }, nextIndex);
  }

  if (type === "INSERT") {
    return entityResult({
      type: "INSERT",
      layer,
      blockName: valueOf(data, "2"),
      x: num(valueOf(data, "10")),
      y: num(valueOf(data, "20")),
      sx: num(valueOf(data, "41")) || 1,
      sy: num(valueOf(data, "42")) || num(valueOf(data, "41")) || 1,
      rotation: deg(num(valueOf(data, "50"))),
    }, nextIndex);
  }

  return { entity: null, nextIndex };
}

function parseDxfPolyline(pairs, index) {
  const header = readDxfEntityData(pairs, index);
  const layer = valueOf(header.data, "8") || "Other";
  const closedFlag = num(valueOf(header.data, "70"));
  const points = [];
  let cursor = header.nextIndex;
  while (cursor < pairs.length && pairs[cursor].code === "0" && pairs[cursor].value === "VERTEX") {
    const vertex = readDxfEntityData(pairs, cursor);
    points.push({ x: num(valueOf(vertex.data, "10")), y: num(valueOf(vertex.data, "20")) });
    cursor = vertex.nextIndex;
  }
  if (cursor < pairs.length && pairs[cursor].code === "0" && pairs[cursor].value === "SEQEND") cursor += 1;
  if (points.length > 1) return entityResult({ type: "POLYLINE", layer, points, closed: Boolean(closedFlag & 1) }, cursor);
  return { entity: null, nextIndex: cursor };
}

function readDxfEntityData(pairs, index) {
  const data = [];
  let cursor = index + 1;
  while (cursor < pairs.length && pairs[cursor].code !== "0") {
    data.push(pairs[cursor]);
    cursor += 1;
  }
  return { data, nextIndex: cursor };
}

function entityResult(entity, nextIndex) {
  return { entity, nextIndex };
}

function sanitizeHatchPoints(points) {
  if (!points || points.length < 3) return points;
  let work = points;
  // 1) Drop leading (0,0) sentinel (HATCH seed point) when the rest of the polygon is elsewhere.
  if (Math.abs(work[0].x) < 0.001 && Math.abs(work[0].y) < 0.001) {
    const restOffOrigin = work.slice(1).every((p) => Math.hypot(p.x, p.y) > 0.5);
    if (restOffOrigin) work = work.slice(1);
  }
  if (work.length < 4) return work;
  // 2) Median-distance outlier rejection — kills pattern-base points & out-of-drawing junk.
  const cx = work.reduce((sum, p) => sum + p.x, 0) / work.length;
  const cy = work.reduce((sum, p) => sum + p.y, 0) / work.length;
  const distances = work.map((p) => Math.hypot(p.x - cx, p.y - cy));
  const sorted = distances.slice().sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 1;
  const limit = Math.max(0.5, median * 6);
  const cleaned = work.filter((_, index) => distances[index] <= limit);
  return cleaned.length >= 3 ? cleaned : work;
}

function expandDxfEntity(entity, blocks, depth = 0) {
  if (entity.type !== "INSERT") return [entity];
  if (!entity.blockName || depth > 6) return [];
  const block = blocks.get(entity.blockName);
  const blockEntities = Array.isArray(block) ? block : block?.entities || [];
  const insertWithBase = {
    ...entity,
    baseX: Array.isArray(block) ? 0 : block?.baseX || 0,
    baseY: Array.isArray(block) ? 0 : block?.baseY || 0,
  };
  return blockEntities.flatMap((blockEntity) => expandDxfEntity(transformInsertedEntity(blockEntity, insertWithBase), blocks, depth + 1));
}

function transformInsertedEntity(entity, insert) {
  const transformed = structuredClone(entity);
  transformed.layer = !transformed.layer || transformed.layer === "0" ? insert.layer : transformed.layer;
  transformed.name = transformed.name || insert.blockName;

  if (transformed.points) transformed.points = transformed.points.map((point) => transformPoint(point, insert));
  if (Number.isFinite(transformed.x) && Number.isFinite(transformed.y)) {
    const point = transformPoint({ x: transformed.x, y: transformed.y }, insert);
    transformed.x = point.x;
    transformed.y = point.y;
  }
  if (Number.isFinite(transformed.cx) && Number.isFinite(transformed.cy)) {
    const point = transformPoint({ x: transformed.cx, y: transformed.cy }, insert);
    transformed.cx = point.x;
    transformed.cy = point.y;
  }
  if (Number.isFinite(transformed.r)) transformed.r *= Math.max(Math.abs(insert.sx), Math.abs(insert.sy));
  return transformed;
}

function transformPoint(point, insert) {
  const localX = point.x - (insert.baseX || 0);
  const localY = point.y - (insert.baseY || 0);
  const scaledX = localX * insert.sx;
  const scaledY = localY * insert.sy;
  const cos = Math.cos(insert.rotation);
  const sin = Math.sin(insert.rotation);
  return {
    x: insert.x + scaledX * cos - scaledY * sin,
    y: insert.y + scaledX * sin + scaledY * cos,
  };
}

function valueOf(data, code) {
  return data.find((pair) => pair.code === code)?.value;
}

function valuesOf(data, code) {
  return data.filter((pair) => pair.code === code).map((pair) => pair.value);
}

function num(value) {
  return Number.parseFloat(value || "0") || 0;
}

function deg(value) {
  return value * Math.PI / 180;
}

function circlePoints(cx, cy, r, segments) {
  return Array.from({ length: segments }, (_, index) => {
    const angle = (Math.PI * 2 * index) / segments;
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  });
}

function arcPoints(cx, cy, r, start, end, segments) {
  const span = end >= start ? end - start : Math.PI * 2 - start + end;
  return Array.from({ length: segments + 1 }, (_, index) => {
    const angle = start + span * (index / segments);
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  });
}

function ellipsePoints(cx, cy, mx, my, ratio, start, end, segments) {
  const majorLength = Math.hypot(mx, my) || 1;
  const ux = mx / majorLength;
  const uy = my / majorLength;
  const vx = -uy * majorLength * ratio;
  const vy = ux * majorLength * ratio;
  const span = end >= start ? end - start : Math.PI * 2 - start + end;
  return Array.from({ length: segments + 1 }, (_, index) => {
    const angle = start + span * (index / segments);
    return {
      x: cx + ux * majorLength * Math.cos(angle) + vx * Math.sin(angle),
      y: cy + uy * majorLength * Math.cos(angle) + vy * Math.sin(angle),
    };
  });
}

function classifyLayer(layerName) {
  const name = layerName.toLowerCase();
  if (name.includes("문자") || name.includes("text") || name.includes("txt") || name.includes("dim") || name.includes("치수") || name.includes("note")) return "Annotation";
  if (name === "wal" || name.startsWith("wal-") || name.includes("wall") || name.includes("a-wall") || name.includes("partition") || name.includes("gyp") || name.includes("벽") || name.includes("벽체") || name.includes("구조") || name.includes("석고") || name.includes("보드") || name.includes("가림판") || name.includes("outline")) return "Wall";
  if (name === "cen" || name.includes("center") || name.includes("centre") || name.includes("중심선") || name === "dot" || name.startsWith("dir-") || name.startsWith("dir_") || name === "axis" || name.startsWith("axis-") || name === "grid" || name.startsWith("grid-") || name === "hat" || name.startsWith("hat-") || name.startsWith("hat_")) return "Ignored";
  if (name.includes("door") || name.includes("출입") || name.includes("문틀") || name.includes("문짝") || /(^|[-_ ])문($|[-_ ])/.test(name)) return "Door";
  if (name.includes("window") || name.includes("창문") || name.includes("창호")) return "Window";
  if (name.includes("furniture") || name.includes("가구") || name.includes("chair") || name.includes("table") || name.includes("desk")) return "Furniture";
  if (name.includes("realistic")) return "Realistic Media";
  if (name.includes("media") || name.includes("monitor") || name.includes("video") || name.includes("screen") || name.includes("영상") || name.includes("모니터") || name.includes("미디어")) return "Monitor Media";
  if (name.includes("panel") || name.includes("pnl") || name.includes("text") || name.includes("graphic") || name.includes("패널") || name.includes("그래픽") || name.includes("설명")) return "Panel";
  if (name.includes("diorama") || name.includes("model") || name.includes("모형") || name.includes("디오라마")) return "Diorama";
  if (name.includes("showcase") || name.includes("case") || name.includes("vitrine") || name.includes("display") || name.includes("진열") || name.includes("쇼케이스") || name.includes("전시대")) return "Showcase";
  if (name.includes("kiosk") || name.includes("키오스크") || name.includes("touch")) return "Kiosk";
  if (name.includes("interactive") || name.includes("hands") || name.includes("experience") || name.includes("체험") || name.includes("인터랙티브") || name.includes("반응형")) return "Interactive";
  return "Other";
}

function computeLayers() {
  const previousLayers = state.layers || new Map();
  const layers = new Map();
  state.entities.forEach((entity) => {
    const category = classifyLayer(entity.layer);
    if (!layers.has(entity.layer)) {
      const previous = previousLayers.get(entity.layer);
      layers.set(entity.layer, {
        raw: entity.layer,
        category: previous?.category || category,
        count: 0,
        visible: previous ? previous.visible : !["Annotation", "Ignored"].includes(category),
      });
    }
    layers.get(entity.layer).count += 1;
  });
  state.layers = layers;
  state.bounds = computeDisplayBounds(state.entities);
  renderLayerList();
}

function renderLayerList() {
  const layerList = document.getElementById("layerList");
  layerList.innerHTML = "";
  [...state.layers.values()].forEach((layer) => {
    const style = LAYER_STYLE[layer.category] || LAYER_STYLE.Other;
    const row = document.createElement("label");
    row.className = "layer-row";
    row.innerHTML = `
      <input type="checkbox" ${layer.visible ? "checked" : ""}>
      <span>
        <span class="layer-title">${style.label}</span>
        <span class="layer-meta">${layer.raw} · ${layer.count}개</span>
      </span>
      <span class="layer-swatch" style="background:${style.color}"></span>
      <select aria-label="${layer.raw} 레이어 분류">
        ${LAYER_CATEGORY_OPTIONS.map((category) => `<option value="${category}" ${category === layer.category ? "selected" : ""}>${LAYER_STYLE[category]?.label || category}</option>`).join("")}
      </select>
    `;
    row.querySelector("input").addEventListener("change", (event) => {
      layer.visible = event.target.checked;
      updateAll();
    });
    row.querySelector("select").addEventListener("change", (event) => {
      layer.category = event.target.value;
      deriveContentsFromEntities();
      updateAll();
    });
    layerList.appendChild(row);
  });
}

function deriveContentsFromEntities() {
  const contents = [];
  const typeCounters = {};
  state.entities.forEach((entity, index) => {
    const category = effectiveCategory(entity, index);
    if (CONTENT_TYPES.some((type) => type.key === category)) {
      typeCounters[category] = (typeCounters[category] || 0) + 1;
      const defaultName = `${CONTENT_TYPE_KO[category] || category} ${typeCounters[category]}`;
      contents.push(createContentFromEntity(entity, index, category, contents.length, defaultName));
    }
  });

  state.contents = contents;
}

function createContentFromEntity(entity, index, category, contentIndex, defaultName) {
  const center = entityCenter(entity);
  const area = entityArea(entity);
  const override = state.entityOverrides[index] || {};
  return {
    id: `C${String(contentIndex + 1).padStart(2, "0")}`,
    name: override.name || defaultName || `${CONTENT_TYPE_KO[category] || category} ${contentIndex + 1}`,
    type: category,
    layer: entity.layer,
    x: center.x,
    y: center.y,
    area,
    inferred: Boolean(override.autoConfidence),
    sourceIndex: index,
  };
}

function effectiveCategory(entity, index) {
  const override = state.entityOverrides[index];
  if (override?.category) return override.category;
  return state.layers.get(entity.layer)?.category || classifyLayer(entity.layer);
}

function entityCenter(entity) {
  if (entity.points?.length) {
    const total = entity.points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
    return { x: total.x / entity.points.length, y: total.y / entity.points.length };
  }
  return { x: entity.x ?? entity.cx ?? 0, y: entity.y ?? entity.cy ?? 0 };
}

function entityArea(entity) {
  if (!entity.points || entity.points.length < 3) return 1;
  let area = 0;
  for (let i = 0; i < entity.points.length; i += 1) {
    const a = entity.points[i];
    const b = entity.points[(i + 1) % entity.points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.max(1, Math.abs(area / 2));
}

function computeBounds(entities) {
  const points = [];
  entities.forEach((entity) => {
    if (entity.points) points.push(...entity.points);
    if (Number.isFinite(entity.x)) points.push({ x: entity.x, y: entity.y });
    if (Number.isFinite(entity.cx) && Number.isFinite(entity.cy) && Number.isFinite(entity.r)) {
      points.push({ x: entity.cx - entity.r, y: entity.cy - entity.r }, { x: entity.cx + entity.r, y: entity.cy + entity.r });
    }
  });
  const finitePoints = points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (!finitePoints.length) return { minX: 0, minY: 0, maxX: 42, maxY: 28, width: 42, height: 28 };
  const minX = Math.min(...finitePoints.map((point) => point.x));
  const minY = Math.min(...finitePoints.map((point) => point.y));
  const maxX = Math.max(...finitePoints.map((point) => point.x));
  const maxY = Math.max(...finitePoints.map((point) => point.y));
  return { minX, minY, maxX, maxY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}

function computeDisplayBounds(entities) {
  return computeVisibleBounds(entities);
}

function computeVisibleBounds(entities) {
  const visible = entities.filter((entity, index) => {
    const layer = state.layers.get(entity.layer);
    if (layer && !layer.visible) return false;
    const category = effectiveCategory(entity, index);
    return !["Annotation", "Ignored"].includes(category);
  });
  const candidates = visible.length ? visible : entities;
  return computeRobustBounds(candidates);
}

function computeRobustBounds(entities) {
  if (entities.length < 40) return computeBounds(entities);

  const items = entities.map((entity) => {
    const bounds = computeBounds([entity]);
    return {
      entity,
      bounds,
      center: {
        x: (bounds.minX + bounds.maxX) / 2,
        y: (bounds.minY + bounds.maxY) / 2,
      },
    };
  });

  const full = mergeBounds(items.map((item) => item.bounds));
  const centerBounds = quantileBounds(items.map((item) => item.center), 0.01, 0.99);
  const paddedCenterBounds = expandBounds(centerBounds, 0.16);
  const pad = Math.max(1, Math.min(full.width, full.height) * 0.015);
  paddedCenterBounds.minX -= pad;
  paddedCenterBounds.maxX += pad;
  paddedCenterBounds.minY -= pad;
  paddedCenterBounds.maxY += pad;
  paddedCenterBounds.width = Math.max(1, paddedCenterBounds.maxX - paddedCenterBounds.minX);
  paddedCenterBounds.height = Math.max(1, paddedCenterBounds.maxY - paddedCenterBounds.minY);

  const clustered = items.filter((item) => pointInBounds(item.center, paddedCenterBounds));
  if (clustered.length < Math.max(12, entities.length * 0.45)) return full;

  const robust = mergeBounds(clustered.map((item) => item.bounds));
  const fullArea = full.width * full.height;
  const robustArea = robust.width * robust.height;
  if (fullArea > robustArea * 4) return expandBounds(robust, 0.08);
  return full;
}

function quantileBounds(points, low, high) {
  const minX = quantile(points.map((point) => point.x), low);
  const maxX = quantile(points.map((point) => point.x), high);
  const minY = quantile(points.map((point) => point.y), low);
  const maxY = quantile(points.map((point) => point.y), high);
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function quantile(values, ratio) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio)));
  return sorted[index];
}

function mergeBounds(boundsList) {
  const valid = boundsList.filter((bounds) => bounds && Number.isFinite(bounds.minX) && Number.isFinite(bounds.minY));
  if (!valid.length) return { minX: 0, minY: 0, maxX: 42, maxY: 28, width: 42, height: 28 };
  const minX = Math.min(...valid.map((bounds) => bounds.minX));
  const minY = Math.min(...valid.map((bounds) => bounds.minY));
  const maxX = Math.max(...valid.map((bounds) => bounds.maxX));
  const maxY = Math.max(...valid.map((bounds) => bounds.maxY));
  return { minX, minY, maxX, maxY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}

function pointInBounds(point, bounds) {
  return point.x >= bounds.minX && point.x <= bounds.maxX && point.y >= bounds.minY && point.y <= bounds.maxY;
}

function updateAll() {
  sizeCanvas();
  state.bounds = currentViewBounds();
  updateMeta();
  renderRoutePickControls();
  renderSelectionPanel();
  draw();
  drawThumbnail();
  updateAnalysis();
}

function currentViewBounds() {
  return state.view.mode === "custom" && state.view.bounds ? state.view.bounds : computeVisibleBounds(state.entities);
}

function resetAutoView() {
  state.view.mode = "auto";
  state.view.bounds = null;
  state.view.zoom = 1;
  state.view.panX = 0;
  state.view.panY = 0;
}

function fitViewToBounds(bounds) {
  state.view.mode = "custom";
  state.view.bounds = expandBounds(bounds, 0.04);
  state.view.zoom = 1;
  state.view.panX = 0;
  state.view.panY = 0;
  updateAll();
}

function expandBounds(bounds, ratio) {
  const padX = bounds.width * ratio;
  const padY = bounds.height * ratio;
  return {
    minX: bounds.minX - padX,
    minY: bounds.minY - padY,
    maxX: bounds.maxX + padX,
    maxY: bounds.maxY + padY,
    width: Math.max(1, bounds.width + padX * 2),
    height: Math.max(1, bounds.height + padY * 2),
  };
}

function fitViewToSelection() {
  const entity = Number.isInteger(state.selectedEntityIndex) ? state.entities[state.selectedEntityIndex] : null;
  if (!entity) {
    alert("먼저 도면에서 맞춤할 객체를 클릭해주세요.");
    return;
  }
  fitViewToBounds(computeBounds([entity]));
}

function togglePanels() {
  const workspace = document.querySelector(".workspace");
  workspace.classList.toggle("focus-mode");
  document.getElementById("togglePanelsButton").textContent = workspace.classList.contains("focus-mode") ? "패널열기" : "패널접기";
  requestAnimationFrame(updateAll);
}

function sizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function transformFor(targetCanvas) {
  const rect = targetCanvas === canvas ? targetCanvas.getBoundingClientRect() : { width: targetCanvas.width, height: targetCanvas.height };
  const pad = targetCanvas === canvas ? 42 : 16;
  const bounds = targetCanvas === canvas ? currentViewBounds() : computeVisibleBounds(state.entities);
  const sx = (rect.width - pad * 2) / bounds.width;
  const sy = (rect.height - pad * 2) / bounds.height;
  const zoom = targetCanvas === canvas ? state.view.zoom : 1;
  const scale = Math.max(0.0001, Math.min(sx, sy) * zoom);
  const panX = targetCanvas === canvas ? state.view.panX : 0;
  const panY = targetCanvas === canvas ? state.view.panY : 0;
  const ox = (rect.width - bounds.width * scale) / 2 - bounds.minX * scale + panX;
  const oy = (rect.height - bounds.height * scale) / 2 - bounds.minY * scale + panY;
  return { scale, ox, oy, height: rect.height };
}

function toScreen(point, transform) {
  return { x: transform.ox + point.x * transform.scale, y: transform.oy + point.y * transform.scale };
}

function fromScreen(x, y, transform) {
  return { x: (x - transform.ox) / transform.scale, y: (y - transform.oy) / transform.scale };
}

function draw(options = {}) {
  const transparent = options.transparent || false;
  const context = options.context || ctx;
  const targetCanvas = options.canvas || canvas;
  const rect = targetCanvas === canvas ? targetCanvas.getBoundingClientRect() : { width: targetCanvas.width, height: targetCanvas.height };
  context.clearRect(0, 0, rect.width, rect.height);
  if (!transparent) {
    context.fillStyle = "#f7f8f5";
    context.fillRect(0, 0, rect.width, rect.height);
  }
  const transform = transformFor(targetCanvas);
  const isAnalysis = state.mode === "analysis";
  const isFlow = state.mode === "flow";
  const isLayer = state.mode === "layer";
  // Heatmap: full strength in analysis, dimmed background in flow, off in layer
  const heatAlpha = isFlow ? 0.32 : 1;
  if (state.filters.heat && !isLayer) drawHeatmap(context, transform, heatAlpha);
  drawEntities(context, transform);
  // Contours: analysis only
  if (state.filters.contours && isAnalysis) drawContours(context, transform);
  // Paths: flow only (분석 모드에서는 동선 라인 숨김)
  if (state.filters.paths && isFlow) drawPaths(context, transform);
  drawRouteEndpoints(context, transform);
  if (state.filters.labels && !isLayer) drawContentLabels(context, transform);
  if (state.hoveredContent) drawHover(context, transform, state.hoveredContent);
  if (Number.isInteger(state.selectedEntityIndex)) drawEntitySelection(context, transform);
}

function drawEntities(context, transform) {
  state.entities.forEach((entity) => {
    const layer = state.layers.get(entity.layer);
    if (layer && !layer.visible) return;
    const index = state.entities.indexOf(entity);
    const category = effectiveCategory(entity, index);
    if (category === "Ignored") return;
    const style = LAYER_STYLE[category] || LAYER_STYLE.Other;
    context.save();
    context.strokeStyle = style.color;
    context.fillStyle = category === "Wall" ? "rgba(143, 150, 148, 0.13)" : "rgba(17, 24, 39, 0.08)";
    context.lineWidth = style.lineWidth;
    context.lineCap = "round";
    context.lineJoin = "round";
    if (entity.points?.length) {
      if (entity.points.length === 1) {
        const p = toScreen(entity.points[0], transform);
        context.beginPath();
        context.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        context.fill();
        context.restore();
        return;
      }
      context.beginPath();
      entity.points.forEach((point, index) => {
        const p = toScreen(point, transform);
        if (index === 0) context.moveTo(p.x, p.y);
        else context.lineTo(p.x, p.y);
      });
      if (entity.closed) context.closePath();
      if (entity.closed && category !== "Wall") context.fill();
      if (entity.closed && category === "Wall") context.fill();
      context.stroke();
    } else if (entity.type === "TEXT") {
      const p = toScreen({ x: entity.x, y: entity.y }, transform);
      context.fillStyle = "#364040";
      context.font = `${Math.max(9, entity.height * transform.scale)}px sans-serif`;
      context.fillText(entity.text, p.x, p.y);
    }
    context.restore();
  });
}

function drawHeatmap(context, transform, alpha = 1) {
  const metrics = analysisMetrics();
  context.save();
  context.globalAlpha = alpha;
  metrics.forEach((metric) => {
    const p = toScreen(metric, transform);
    // Floor the normalized value so even calm contents show a visible heatmap halo —
    // visitors walk past every object, so no content should look "empty".
    const normalized = Math.max(0.18, metric.normalized);
    const intensity = Math.max(0.4, metric.intensity);
    const radius = Math.max(34, Math.min(160, (2.6 + intensity * 2.2) * transform.scale));
    const gradient = context.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
    gradient.addColorStop(0, `rgba(215, 25, 28, ${0.12 + normalized * 0.44})`);
    gradient.addColorStop(0.35, `rgba(253, 174, 97, ${0.14 + normalized * 0.22})`);
    gradient.addColorStop(0.7, `rgba(65, 171, 93, ${0.10 + normalized * 0.14})`);
    gradient.addColorStop(1, "rgba(158, 202, 225, 0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(p.x, p.y, radius, 0, Math.PI * 2);
    context.fill();
  });
  context.restore();
}

function drawContours(context, transform) {
  const metrics = analysisMetrics();
  context.save();
  context.setLineDash([5, 5]);
  metrics.forEach((metric) => {
    const p = toScreen(metric, transform);
    const count = Math.min(4, Math.max(1, Math.ceil(metric.normalized * 4)));
    for (let i = 1; i <= count; i += 1) {
      context.beginPath();
      context.strokeStyle = i >= 3 ? "rgba(215, 25, 28, 0.58)" : "rgba(55, 65, 81, 0.32)";
      context.lineWidth = 1;
      context.arc(p.x, p.y, i * transform.scale, 0, Math.PI * 2);
      context.stroke();
    }
  });
  context.restore();
}

function drawPaths(context, transform) {
  const bounds = state.bounds;
  if (!bounds) return;
  if (!state.contents.length && !(state.entrancePoint && state.exitPoint)) return;
  const entry = state.entrancePoint || { x: bounds.minX + bounds.width * 0.05, y: bounds.minY + bounds.height * 0.5 };
  const exit = state.exitPoint || { x: bounds.maxX - bounds.width * 0.05, y: bounds.minY + bounds.height * 0.5 };
  state.personas
    .filter((persona) => state.activePersonas.has(persona.key))
    .forEach((persona, index) => {
      const route = routeForPersona(persona, entry, exit, index);
      if (route.length < 2) return;
      context.save();
      context.strokeStyle = persona.color;
      context.fillStyle = persona.color;
      context.globalAlpha = 0.82;
      context.lineWidth = 2.6;
      context.beginPath();
      route.forEach((point, routeIndex) => {
        const p = toScreen(point, transform);
        if (routeIndex === 0) context.moveTo(p.x, p.y);
        else {
          const prev = toScreen(route[routeIndex - 1], transform);
          const cpX = (prev.x + p.x) / 2;
          context.quadraticCurveTo(cpX, prev.y, p.x, p.y);
        }
      });
      context.stroke();
      drawArrow(context, toScreen(route.at(-2), transform), toScreen(route.at(-1), transform), persona.color);
      context.restore();
    });
}

function drawRouteEndpoints(context, transform) {
  if (state.entrancePoint) drawRouteMarker(context, transform, state.entrancePoint, "입구", "#0f766e");
  if (state.exitPoint) drawRouteMarker(context, transform, state.exitPoint, "출구", "#c2410c");
}

function drawRouteMarker(context, transform, point, label, color) {
  const p = toScreen(point, transform);
  context.save();
  context.fillStyle = color;
  context.strokeStyle = "white";
  context.lineWidth = 3;
  context.beginPath();
  context.arc(p.x, p.y, 8, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = "rgba(255,255,255,0.96)";
  context.strokeStyle = "rgba(29,36,37,0.18)";
  context.lineWidth = 1;
  context.font = "12px sans-serif";
  const width = context.measureText(label).width + 14;
  roundRect(context, p.x - width / 2, p.y - 30, width, 22, 6);
  context.fill();
  context.stroke();
  context.fillStyle = color;
  context.fillText(label, p.x - width / 2 + 7, p.y - 15);
  context.restore();
}

function drawArrow(context, from, to, color) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  context.save();
  context.translate(to.x, to.y);
  context.rotate(angle);
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(-9, -5);
  context.lineTo(-9, 5);
  context.closePath();
  context.fill();
  context.restore();
}

function routeForPersona(persona, entry, exit, index) {
  const preferred = selectAutoRouteStops(persona, entry, exit);
  const offset = (index - 1.5) * ((state.bounds?.height || 20) * 0.025);
  const routeCore = preferred.length ? preferred.map((content) => ({ x: content.x, y: content.y })) : fallbackRouteStops(entry, exit);
  const direction = normalizeVector({ x: exit.x - entry.x, y: exit.y - entry.y });
  const normal = { x: -direction.y, y: direction.x };
  return [
    offsetPoint(entry, normal, offset),
    ...routeCore.map((point) => offsetPoint(point, normal, offset)),
    offsetPoint(exit, normal, offset),
  ];
}

function selectAutoRouteStops(persona, entry, exit) {
  if (!state.contents.length) return [];
  const axis = normalizeVector({ x: exit.x - entry.x, y: exit.y - entry.y });
  const length = Math.max(1, Math.hypot(exit.x - entry.x, exit.y - entry.y));
  // Visitors walk through the whole space — visit ALL contents, ordered along the entry→exit axis.
  // Preference no longer filters stops; it only nudges the visit ORDER (preferred ones get pulled
  // slightly closer in their projection slot so the line gravitates toward them on near-ties).
  const scored = state.contents.map((content) => {
    const projection = ((content.x - entry.x) * axis.x + (content.y - entry.y) * axis.y) / length;
    const offAxis = ((content.x - entry.x) * -axis.y + (content.y - entry.y) * axis.x) / length;
    const preferred = persona.prefers.includes(content.type);
    return {
      ...content,
      projection,
      offAxis,
      preferred,
      // Tie-break key: smaller for preferred so it sorts slightly earlier when projections collide
      tieKey: preferred ? -0.5 : 0,
    };
  });
  return scored.sort((a, b) => {
    const diff = a.projection - b.projection;
    if (Math.abs(diff) > 0.04) return diff;
    return a.tieKey - b.tieKey;
  });
}

function fallbackRouteStops(entry, exit) {
  const bounds = state.bounds || computeVisibleBounds(state.entities);
  const direction = normalizeVector({ x: exit.x - entry.x, y: exit.y - entry.y });
  const normal = { x: -direction.y, y: direction.x };
  const bend = Math.min(bounds.width, bounds.height) * 0.12;
  const samples = [0.22, 0.44, 0.66, 0.84];
  return samples.map((t, sampleIndex) => {
    const wave = Math.sin((sampleIndex + 1) * Math.PI / (samples.length + 1));
    const side = sampleIndex % 2 === 0 ? 1 : -0.55;
    return clampPointToBounds({
      x: entry.x + (exit.x - entry.x) * t + normal.x * bend * wave * side,
      y: entry.y + (exit.y - entry.y) * t + normal.y * bend * wave * side,
    }, bounds);
  });
}

function clampPointToBounds(point, bounds) {
  return {
    x: Math.min(bounds.maxX, Math.max(bounds.minX, point.x)),
    y: Math.min(bounds.maxY, Math.max(bounds.minY, point.y)),
  };
}

function normalizeVector(vector) {
  const length = Math.hypot(vector.x, vector.y) || 1;
  return { x: vector.x / length, y: vector.y / length };
}

function offsetPoint(point, normal, offset) {
  return { x: point.x + normal.x * offset, y: point.y + normal.y * offset };
}

function drawContentLabels(context, transform) {
  contentMetrics().forEach((metric) => {
    const p = toScreen(metric, transform);
    context.save();
    context.fillStyle = "rgba(255,255,255,0.92)";
    context.strokeStyle = "rgba(29,36,37,0.16)";
    context.lineWidth = 1;
    const label = `${metric.id} ${metric.type}`;
    context.font = "12px sans-serif";
    const width = context.measureText(label).width + 14;
    const x = p.x - width / 2;
    const y = p.y - 26;
    roundRect(context, x, y, width, 22, 6);
    context.fill();
    context.stroke();
    context.fillStyle = metric.normalized > 0.72 ? "#a01818" : "#1d2425";
    context.fillText(label, x + 7, y + 15);
    context.restore();
  });
}

function drawHover(context, transform, content) {
  const p = toScreen(content, transform);
  context.save();
  context.strokeStyle = "#0f766e";
  context.lineWidth = 3;
  context.beginPath();
  context.arc(p.x, p.y, 18, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function personaContentMatrix() {
  const visibleContents = state.contents.filter((content) => {
    const layer = state.layers.get(content.layer);
    return !layer || layer.visible;
  });
  return visibleContents.map((content) => {
    const duration = state.durations.find((item) => item.key === content.type)?.value || 1;
    const perPersona = state.personas.map((persona) => {
      const active = state.activePersonas.has(persona.key);
      const preference = persona.prefers.includes(content.type) ? 1.42 : 0.74;
      const multiplier = active ? (persona.weight / 100) * preference / persona.speed : 0;
      const visits = Math.round(state.visitors * multiplier * (0.035 + Math.min(content.area, 12) * 0.004));
      return { key: persona.key, label: persona.label, color: persona.color, weight: persona.weight, visits, active };
    });
    const totalVisits = perPersona.reduce((sum, p) => sum + p.visits, 0) || 1;
    const shares = perPersona.map((p) => ({ ...p, share: Math.round((100 * p.visits) / totalVisits) }));
    const ranked = shares.slice().sort((a, b) => b.share - a.share);
    const congestion = (totalVisits * duration) / Math.max(1, content.area * 48);
    const override = state.entityOverrides[content.sourceIndex] || {};
    return {
      id: content.id,
      name: content.name,
      type: content.type,
      sourceIndex: content.sourceIndex,
      confidence: override.autoConfidence || null,
      reason: override.autoReason || null,
      duration,
      totalVisits,
      congestion,
      shares,
      dominant: ranked[0],
      second: ranked[1],
      recommendation: recommendIntervention(content, ranked, congestion),
    };
  });
}

function recommendIntervention(content, ranked, congestion) {
  const dominant = ranked[0];
  const second = ranked[1];
  if (congestion < 2) return "여유 — 휴식/완충존 후보";
  const singleTip = {
    Explorer: "어린이 우세 → 분산 체험·보조 그래픽 추가",
    Influencer: "청년 우세 → 포토존·SNS 동선 분리",
    Seeker: "중장년 우세 → 텍스트 가독성·정보 밀도 조정",
    Relaxer: "노년 우세 → 좌석·휴식대 + 폰트 확대",
  };
  if (dominant.share >= 45) return singleTip[dominant.key] || "주력 페르소나 단독 정체";
  if (dominant.share >= 38 && (dominant.share - second.share) >= 8) {
    return `${singleTip[dominant.key]} (지배율 ${dominant.share}%)`;
  }
  if (dominant.share + second.share >= 65) {
    return `${dominant.label}·${second.label} 합산 ${dominant.share + second.share}% → 시간대 분리 / 별도 동선`;
  }
  if (congestion >= 12) return "전 페르소나 정체 → 면적 확대 필수";
  return "균등 분산 정체 → 인접 휴식존 또는 우회로 신설";
}

function renderPersonaMatrix() {
  const target = document.getElementById("personaMatrix");
  if (!target) return;
  const data = personaContentMatrix().sort((a, b) => b.congestion - a.congestion).slice(0, 12);
  if (!data.length) {
    target.innerHTML = '<div class="matrix-empty">콘텐츠를 분류하면 페르소나별 기여도를 표로 보여줍니다.</div>';
    return;
  }
  const headers = state.personas.map((persona) => `<th style="color:${persona.color}">${persona.label}</th>`).join("");
  const rows = data.map((row) => {
    const cells = state.personas
      .map((persona) => {
        const cell = row.shares.find((s) => s.key === persona.key);
        const share = cell ? cell.share : 0;
        const intensity = Math.min(1, share / 60);
        const rgb = hexToRgbString(persona.color);
        const dominant = row.dominant.key === persona.key && share >= 35;
        return `<td class="pm-cell${dominant ? " pm-dominant" : ""}" style="background:rgba(${rgb}, ${0.08 + intensity * 0.5})">${share}%</td>`;
      })
      .join("");
    const congestionClass = row.congestion >= 12 ? "pm-cong-high" : row.congestion >= 5 ? "pm-cong-mid" : "pm-cong-low";
    const confMeta = {
      high: { cls: "pm-conf-high", label: "분류 신뢰도 높음" },
      medium: { cls: "pm-conf-medium", label: "분류 신뢰도 보통" },
      low: { cls: "pm-conf-low", label: "분류 신뢰도 낮음 — 확인 권장" },
    }[row.confidence] || null;
    const dotTitle = confMeta ? `${confMeta.label}${row.reason ? ` · ${row.reason}` : ""}` : "사용자 지정 분류";
    const dot = `<span class="pm-conf-dot ${confMeta ? confMeta.cls : "pm-conf-user"}" title="${escapeHtml(dotTitle)}"></span>`;
    return `
      <tr data-source-index="${row.sourceIndex}" title="클릭하면 도면에서 위치를 확대합니다">
        <td class="pm-content">
          <strong>${dot}${row.id}</strong>
          <small>${LAYER_STYLE[row.type]?.label || row.type}</small>
        </td>
        ${cells}
        <td class="pm-cong ${congestionClass}">${row.congestion.toFixed(1)}</td>
        <td class="pm-rec">${row.recommendation}</td>
      </tr>
    `;
  }).join("");
  target.innerHTML = `
    <div class="pm-scroll">
      <table class="pm-table">
        <thead><tr><th>콘텐츠</th>${headers}<th>혼잡</th><th>권고</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
  target.querySelectorAll("tr[data-source-index]").forEach((tr) => {
    tr.addEventListener("click", () => locateContentByIndex(Number(tr.dataset.sourceIndex)));
  });
}

function locateContentByIndex(index) {
  if (!Number.isInteger(index)) return;
  const entity = state.entities[index];
  if (!entity) return;
  state.selectedEntityIndex = index;
  const select = document.getElementById("entityCategorySelect");
  if (select) select.value = effectiveCategory(entity, index);
  fitViewToBounds(expandBounds(computeBounds([entity]), 1.5));
  renderSelectionPanel();
  draw();
}

function hexToRgbString(hex) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
  return `${(bigint >> 16) & 255}, ${(bigint >> 8) & 255}, ${bigint & 255}`;
}

function contentMetrics() {
  const visibleContents = state.contents.filter((content) => {
    const layer = state.layers.get(content.layer);
    return !layer || layer.visible;
  });
  const metrics = visibleContents.map((content) => {
    const duration = state.durations.find((item) => item.key === content.type)?.value || 1;
    const personaMultiplier = state.personas.reduce((sum, persona) => {
      if (!state.activePersonas.has(persona.key)) return sum;
      const preference = persona.prefers.includes(content.type) ? 1.42 : 0.74;
      return sum + (persona.weight / 100) * preference / persona.speed;
    }, 0);
    const visits = Math.round(state.visitors * personaMultiplier * (0.035 + Math.min(content.area, 12) * 0.004));
    const congestion = visits * duration / Math.max(1, content.area * 48);
    return { ...content, duration, visits, congestion, intensity: Math.min(5, congestion) };
  });
  const maxCongestion = Math.max(1, ...metrics.map((metric) => metric.congestion));
  return metrics.map((metric) => ({ ...metric, normalized: metric.congestion / maxCongestion }));
}

function analysisMetrics() {
  const content = contentMetrics();
  return content.length ? content : routeFlowMetrics();
}

function routeFlowMetrics() {
  if (!state.entrancePoint || !state.exitPoint) return [];
  const activePersonas = state.personas.filter((persona) => state.activePersonas.has(persona.key));
  const totalWeight = activePersonas.reduce((sum, persona) => sum + persona.weight, 0) || 100;
  const routes = activePersonas.map((persona, index) => routeForPersona(persona, state.entrancePoint, state.exitPoint, index));
  const points = [];

  routes.forEach((route) => {
    for (let i = 0; i < route.length - 1; i += 1) {
      const a = route[i];
      const b = route[i + 1];
      const length = Math.max(0.1, Math.hypot(b.x - a.x, b.y - a.y));
      const samples = Math.max(2, Math.ceil(length / Math.max(1, (state.bounds?.width || 30) * 0.08)));
      for (let sample = 1; sample < samples; sample += 1) {
        const t = sample / samples;
        points.push({
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
          segmentLength: length,
        });
      }
    }
  });

  const visitorsPerPoint = state.visitors / Math.max(1, points.length);
  const metrics = points.map((point, index) => {
    const congestion = visitorsPerPoint * (totalWeight / 100) / Math.max(1, point.segmentLength * 16);
    return {
      id: `R${String(index + 1).padStart(2, "0")}`,
      name: `자동 동선 구간 ${index + 1}`,
      type: "Route",
      layer: "AUTO_ROUTE",
      x: point.x,
      y: point.y,
      area: 1,
      duration: 0.2,
      visits: Math.round(visitorsPerPoint),
      congestion,
      intensity: Math.min(5, congestion),
    };
  });
  const maxCongestion = Math.max(1, ...metrics.map((metric) => metric.congestion));
  return metrics.map((metric) => ({ ...metric, normalized: metric.congestion / maxCongestion }));
}

function handleCanvasMove(event) {
  if (state.view.panning) return;
  const rect = canvas.getBoundingClientRect();
  const transform = transformFor(canvas);
  const point = fromScreen(event.clientX - rect.left, event.clientY - rect.top, transform);
  const metrics = analysisMetrics();
  const hit = metrics.find((content) => Math.hypot(content.x - point.x, content.y - point.y) < 1.4);
  state.hoveredContent = hit || null;
  if (hit) {
    tooltip.hidden = false;
    tooltip.style.left = `${event.clientX - rect.left + 14}px`;
    tooltip.style.top = `${event.clientY - rect.top + 14}px`;
    tooltip.innerHTML = `
      <strong>${hit.name}</strong>
      유형: ${hit.type}<br>
      예상 방문: ${formatNumber.format(hit.visits)}명<br>
      평균 체류: ${hit.duration.toFixed(1)}분<br>
      혼잡지수: ${hit.congestion.toFixed(2)}
    `;
  } else {
    tooltip.hidden = true;
  }
  draw();
}

function handleCanvasClick(event) {
  if (state.view.didDrag) {
    state.view.didDrag = false;
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const transform = transformFor(canvas);
  const point = fromScreen(event.clientX - rect.left, event.clientY - rect.top, transform);
  if (state.routePickMode) {
    if (state.routePickMode === "entrance") state.entrancePoint = point;
    if (state.routePickMode === "exit") state.exitPoint = point;
    state.routePickMode = null;
    renderRoutePickControls();
    updateAll();
    return;
  }
  const hit = findEntityAtPoint(point, 10 / transform.scale);
  state.selectedEntityIndex = hit;
  renderSelectionPanel();
  draw();
}

function setRoutePickMode(mode) {
  state.routePickMode = state.routePickMode === mode ? null : mode;
  renderRoutePickControls();
}

function renderRoutePickControls() {
  const entrance = document.getElementById("setEntranceButton");
  const exit = document.getElementById("setExitButton");
  if (!entrance || !exit) return;
  entrance.classList.toggle("active", state.routePickMode === "entrance");
  exit.classList.toggle("active", state.routePickMode === "exit");
  entrance.textContent = state.entrancePoint ? "입구변경" : "입구지정";
  exit.textContent = state.exitPoint ? "출구변경" : "출구지정";
}

function handleCanvasWheel(event) {
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const before = fromScreen(x, y, transformFor(canvas));
  if (state.view.mode !== "custom") {
    state.view.mode = "custom";
    state.view.bounds = currentViewBounds();
  }
  const factor = event.deltaY < 0 ? 1.12 : 0.89;
  state.view.zoom = Math.max(0.08, Math.min(80, state.view.zoom * factor));
  const after = toScreen(before, transformFor(canvas));
  state.view.panX += x - after.x;
  state.view.panY += y - after.y;
  state.bounds = currentViewBounds();
  draw();
}

function handleCanvasMouseDown(event) {
  if (event.button !== 0) return;
  state.view.panning = true;
  state.view.didDrag = false;
  state.view.lastX = event.clientX;
  state.view.lastY = event.clientY;
  canvas.parentElement.classList.add("is-panning");
  if (state.view.mode !== "custom") {
    state.view.mode = "custom";
    state.view.bounds = currentViewBounds();
  }
}

function handleCanvasPanMove(event) {
  if (!state.view.panning) return;
  const dx = event.clientX - state.view.lastX;
  const dy = event.clientY - state.view.lastY;
  if (Math.abs(dx) + Math.abs(dy) > 2) state.view.didDrag = true;
  state.view.panX += dx;
  state.view.panY += dy;
  state.view.lastX = event.clientX;
  state.view.lastY = event.clientY;
  draw();
}

function endCanvasPan() {
  if (!state.view.panning) return;
  state.view.panning = false;
  canvas.parentElement.classList.remove("is-panning");
}

function findEntityAtPoint(point, tolerance) {
  let bestIndex = null;
  let bestDistance = Infinity;
  state.entities.forEach((entity, index) => {
    const layer = state.layers.get(entity.layer);
    if (layer && !layer.visible) return;
    const category = effectiveCategory(entity, index);
    if (category === "Ignored") return;
    const distance = distanceToEntity(point, entity);
    if (distance <= tolerance && distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function distanceToEntity(point, entity) {
  if (entity.points?.length) {
    if (entity.closed && pointInPolygon(point, entity.points)) return 0;
    let minDistance = Infinity;
    for (let i = 0; i < entity.points.length - 1; i += 1) {
      minDistance = Math.min(minDistance, distanceToSegment(point, entity.points[i], entity.points[i + 1]));
    }
    if (entity.closed && entity.points.length > 2) {
      minDistance = Math.min(minDistance, distanceToSegment(point, entity.points.at(-1), entity.points[0]));
    }
    return minDistance;
  }
  if (Number.isFinite(entity.x) && Number.isFinite(entity.y)) return Math.hypot(point.x - entity.x, point.y - entity.y);
  return Infinity;
}

function distanceToSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (!lengthSq) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const pi = polygon[i];
    const pj = polygon[j];
    const intersects = ((pi.y > point.y) !== (pj.y > point.y)) &&
      point.x < ((pj.x - pi.x) * (point.y - pi.y)) / ((pj.y - pi.y) || 1) + pi.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function renderSelectionPanel() {
  const box = document.getElementById("selectionBox");
  const select = document.getElementById("entityCategorySelect");
  const nameInput = document.getElementById("entityNameInput");
  const applyButton = document.getElementById("applyEntityCategory");
  const applyLayerButton = document.getElementById("applyLayerCategory");
  if (!box || !select || !nameInput) return;

  const index = state.selectedEntityIndex;
  const entity = Number.isInteger(index) ? state.entities[index] : null;
  const disabled = !entity;
  applyButton.disabled = disabled;
  applyLayerButton.disabled = disabled;
  select.disabled = disabled;
  nameInput.disabled = disabled;

  if (!entity) {
    box.textContent = "도면에서 객체를 클릭하면 이곳에서 분류를 지정할 수 있습니다.";
    nameInput.value = "";
    return;
  }

  const category = effectiveCategory(entity, index);
  select.value = category;
  nameInput.value = state.entityOverrides[index]?.name || entity.name || entity.text || "";
  const bounds = computeBounds([entity]);
  const override = state.entityOverrides[index] || {};
  const confLabel = { high: "높음", medium: "보통", low: "낮음 (확인 권장)" }[override.autoConfidence];
  const autoLine = override.autoConfidence
    ? `<br>자동 분류 신뢰도: ${confLabel}${override.autoReason ? `<br><span class="sel-reason">${escapeHtml(override.autoReason)}</span>` : ""}`
    : "";
  box.innerHTML = `
    <strong>선택 ${index + 1}</strong>
    ${entity.type} · CAD 레이어: ${escapeHtml(entity.layer)}<br>
    현재 분류: ${LAYER_STYLE[category]?.label || category}<br>
    크기: ${bounds.width.toFixed(2)}m × ${bounds.height.toFixed(2)}m${autoLine}
  `;
}

function applySelectedEntityCategory() {
  const index = state.selectedEntityIndex;
  if (!Number.isInteger(index)) return;
  const category = document.getElementById("entityCategorySelect").value;
  const name = document.getElementById("entityNameInput").value.trim();
  state.entityOverrides[index] = { category, name };
  deriveContentsFromEntities();
  updateAll();
}

function applySelectedLayerCategory() {
  const index = state.selectedEntityIndex;
  const selected = Number.isInteger(index) ? state.entities[index] : null;
  if (!selected) return;
  const category = document.getElementById("entityCategorySelect").value;
  const layer = state.layers.get(selected.layer);
  if (layer) layer.category = category;
  state.entities.forEach((entity, entityIndex) => {
    if (entity.layer === selected.layer && state.entityOverrides[entityIndex]) {
      delete state.entityOverrides[entityIndex];
    }
  });
  deriveContentsFromEntities();
  updateAll();
}

function autoAssignContentCandidates(options = {}) {
  const bounds = computeVisibleBounds(state.entities);
  const candidates = state.entities
    .map((entity, index) => ({ entity, index, category: effectiveCategory(entity, index), area: entityArea(entity), entityBounds: computeBounds([entity]) }))
    .filter((item) => isAutoContentCandidate(item, bounds))
    .sort((a, b) => b.area - a.area)
    .slice(0, 120);

  candidates.forEach((item) => {
    const decision = inferAutoContentDecision(item, bounds, state.entities);
    state.entityOverrides[item.index] = {
      category: decision.category,
      // Keep a real user-typed name if present; otherwise leave undefined so
      // deriveContentsFromEntities assigns an accurate type-based Korean name (체험존 1, 진열장 2 …).
      name: state.entityOverrides[item.index]?.name,
      autoConfidence: decision.confidence,
      autoReason: decision.reason,
    };
  });

  deriveContentsFromEntities();
  updateAll();

  if (options.silent) return candidates.length;
  if (!candidates.length) {
    alert("자동으로 잡을 수 있는 콘텐츠 후보가 없습니다. 도면에서 객체를 클릭한 뒤 Panel/Media/Showcase 등으로 직접 지정해주세요.");
    return 0;
  }
  alert(`${candidates.length}개 객체를 콘텐츠 후보로 지정했습니다. 필요 없는 항목은 클릭 후 '분석 제외'로 바꿀 수 있습니다.`);
  return candidates.length;
}

function isAutoContentCandidate(item, bounds) {
  if (CONTENT_TYPES.some((type) => type.key === item.category)) return false;
  if (["Wall", "Door", "Window", "Annotation", "Ignored"].includes(item.category)) return false;
  const { entity, entityBounds } = item;
  if (!entity.points || entity.points.length < 3) return false;
  if (!entity.closed && !["CIRCLE", "ELLIPSE", "HATCH", "SOLID", "TRACE", "3DFACE"].includes(entity.type)) return false;
  const xs = entity.points.map((p) => p.x);
  const ys = entity.points.map((p) => p.y);
  const rawW = Math.max(...xs) - Math.min(...xs);
  const rawH = Math.max(...ys) - Math.min(...ys);
  if (rawW < 0.5 || rawH < 0.5) return false;
  const rawBoxArea = rawW * rawH;
  const boundsArea = Math.max(1, bounds.width * bounds.height);
  if (rawBoxArea < boundsArea * 0.0006) return false;
  if (rawBoxArea > boundsArea * 0.18) return false;
  const longSide = Math.max(rawW, rawH);
  const shortSide = Math.max(0.001, Math.min(rawW, rawH));
  if (longSide / shortSide > 12) return false;
  if (entityBounds.width > bounds.width * 0.65 || entityBounds.height > bounds.height * 0.65) return false;
  return true;
}

function inferAutoContentCategory(item, bounds) {
  return inferAutoContentDecision(item, bounds, state.entities).category;
}

function inferAutoContentDecision(item, bounds, allEntities) {
  const layerName = (item.entity.layer || "").toLowerCase();
  const blockName = (item.entity.blockName || item.entity.name || "").toLowerCase();
  const label = `${layerName} ${blockName}`;

  // Hard overrides from layer or block name (highest confidence)
  if (/media|monitor|screen|video|영상|미디어|모니터/.test(label)) return { category: "Monitor Media", confidence: "high", reason: "layer/block name" };
  if (/realistic|immersive|theater|시어터|실감/.test(label)) return { category: "Realistic Media", confidence: "high", reason: "layer/block name" };
  if (/kiosk|touch|키오스크|터치/.test(label)) return { category: "Kiosk", confidence: "high", reason: "layer/block name" };
  if (/interactive|hands|체험|인터랙티브|반응형/.test(label)) return { category: "Interactive", confidence: "high", reason: "layer/block name" };
  if (/diorama|디오라마|모형|model/.test(label)) return { category: "Diorama", confidence: "high", reason: "layer/block name" };
  if (/show|display|case|쇼케이스|진열|전시대|vitrine/.test(label)) return { category: "Showcase", confidence: "high", reason: "layer/block name" };
  if (/panel|graphic|패널|그래픽|설명|배경/.test(label)) return { category: "Panel", confidence: "high", reason: "layer/block name" };

  // Geometric features (use raw, unclamped values)
  const xs = item.entity.points.map((p) => p.x);
  const ys = item.entity.points.map((p) => p.y);
  const rawW = Math.max(...xs) - Math.min(...xs);
  const rawH = Math.max(...ys) - Math.min(...ys);
  const boxArea = rawW * rawH;
  const longSide = Math.max(rawW, rawH);
  const shortSide = Math.max(0.001, Math.min(rawW, rawH));
  const aspect = longSide / shortSide;
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  let perim = 0;
  for (let i = 0; i < item.entity.points.length; i += 1) {
    const a = item.entity.points[i];
    const b = item.entity.points[(i + 1) % item.entity.points.length];
    perim += Math.hypot(b.x - a.x, b.y - a.y);
  }
  let polyArea = 0;
  for (let i = 0; i < item.entity.points.length; i += 1) {
    const a = item.entity.points[i];
    const b = item.entity.points[(i + 1) % item.entity.points.length];
    polyArea += a.x * b.y - b.x * a.y;
  }
  polyArea = Math.abs(polyArea / 2);
  const compactness = perim > 0 ? Math.min(1, (4 * Math.PI * polyArea) / (perim * perim)) : 0;

  // Adjacent TEXT label search (within 0.8 * longSide of centroid)
  const textHit = findNearbyContentKeyword(cx, cy, Math.max(1.5, longSide * 0.8), allEntities);
  if (textHit) return { category: textHit.category, confidence: "high", reason: `TEXT "${textHit.match}" 인접` };

  // Wall proximity
  const wallDist = computeWallProximity(cx, cy, allEntities);

  // Scoring system
  const scores = { Panel: 0, "Monitor Media": 0, "Realistic Media": 0, Diorama: 0, Showcase: 0, Kiosk: 0, Interactive: 0 };

  // Aspect ratio
  if (aspect > 4) scores.Panel += 3;
  else if (aspect > 2.5) { scores.Panel += 1; scores.Showcase += 1; }
  else { scores.Kiosk += 0.8; scores.Showcase += 0.5; scores.Diorama += 0.5; scores.Interactive += 0.5; }

  // Area bands
  if (boxArea < 1) {
    scores.Panel += 1.5;
    scores.Kiosk += 1.5;
  } else if (boxArea < 3) {
    scores.Showcase += 2;
    scores.Kiosk += 1;
    scores.Panel += 0.5;
  } else if (boxArea < 8) {
    scores.Showcase += 1.2;
    scores.Interactive += 1.5;
    scores.Diorama += 1;
  } else if (boxArea < 20) {
    scores.Interactive += 2;
    scores.Diorama += 1.8;
  } else {
    scores.Diorama += 3;
    scores.Interactive += 1.5;
  }

  // Wall proximity → Panel boost (only meaningful for small objects)
  if (wallDist < 0.6 && longSide < 3) scores.Panel += 2.5;
  else if (wallDist < 1.2 && longSide < 3) scores.Panel += 1;
  else if (wallDist > 2) { scores.Diorama += 0.8; scores.Interactive += 0.6; scores.Kiosk += 0.4; }

  // Compactness
  if (compactness > 0.85) {
    scores.Kiosk += 1.2;
    scores.Showcase += 0.4;
  } else if (compactness < 0.45) {
    scores.Diorama += 1.5;
    scores.Interactive += 0.5;
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const top = ranked[0];
  const second = ranked[1];
  const gap = top[1] - second[1];
  const confidence = gap >= 1.5 ? "medium" : gap >= 0.6 ? "low" : "low";
  return {
    category: top[0],
    confidence,
    reason: `aspect ${aspect.toFixed(1)} · 면적 ${boxArea.toFixed(1)}m² · 벽거리 ${wallDist.toFixed(1)}m · 원형도 ${compactness.toFixed(2)}`,
  };
}

function findNearbyContentKeyword(cx, cy, radius, allEntities) {
  const rules = [
    [/체험|체험존|체험형|hands|experience/i, "Interactive"],
    [/터치|키오스크|touch|kiosk/i, "Kiosk"],
    [/실감|immersive|theater|시어터/i, "Realistic Media"],
    [/영상|미디어|모니터|media|monitor|screen|video/i, "Monitor Media"],
    [/디오라마|모형|diorama|model/i, "Diorama"],
    [/쇼케이스|진열|전시대|showcase|vitrine|case/i, "Showcase"],
    [/패널|그래픽|설명|배경|panel|graphic/i, "Panel"],
  ];
  let best = null;
  for (const e of allEntities) {
    if (e.type !== "TEXT" || !e.text) continue;
    const ex = Number.isFinite(e.x) ? e.x : (e.points?.[0]?.x);
    const ey = Number.isFinite(e.y) ? e.y : (e.points?.[0]?.y);
    if (!Number.isFinite(ex) || !Number.isFinite(ey)) continue;
    const d = Math.hypot(ex - cx, ey - cy);
    if (d > radius) continue;
    for (const [re, category] of rules) {
      const m = e.text.match(re);
      if (m) {
        if (!best || d < best.distance) best = { category, distance: d, match: m[0] };
        break;
      }
    }
  }
  return best;
}

function computeWallProximity(cx, cy, allEntities) {
  let minDist = Infinity;
  for (const e of allEntities) {
    const layerLower = (e.layer || "").toLowerCase();
    const isWall = /wal|wall|벽|partition|gyp|석고|보드|가림판/.test(layerLower);
    if (!isWall) continue;
    if (!e.points || e.points.length < 2) continue;
    for (let i = 0; i < e.points.length - 1; i += 1) {
      const d = distanceToSegment({ x: cx, y: cy }, e.points[i], e.points[i + 1]);
      if (d < minDist) minDist = d;
      if (minDist < 0.05) return 0;
    }
    if (e.closed && e.points.length > 2) {
      const d = distanceToSegment({ x: cx, y: cy }, e.points[e.points.length - 1], e.points[0]);
      if (d < minDist) minDist = d;
    }
  }
  return Number.isFinite(minDist) ? minDist : 999;
}

function drawEntitySelection(context, transform) {
  const entity = state.entities[state.selectedEntityIndex];
  if (!entity) return;
  context.save();
  context.strokeStyle = "#f59e0b";
  context.fillStyle = "rgba(245, 158, 11, 0.12)";
  context.lineWidth = 4;
  context.setLineDash([8, 4]);
  if (entity.points?.length) {
    context.beginPath();
    entity.points.forEach((point, index) => {
      const p = toScreen(point, transform);
      if (index === 0) context.moveTo(p.x, p.y);
      else context.lineTo(p.x, p.y);
    });
    if (entity.closed) context.closePath();
    if (entity.closed) context.fill();
    context.stroke();
  } else {
    const p = toScreen(entityCenter(entity), transform);
    context.beginPath();
    context.arc(p.x, p.y, 18, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }
  context.restore();
}

function drawThumbnail() {
  thumbCtx.clearRect(0, 0, thumbCanvas.width, thumbCanvas.height);
  thumbCtx.fillStyle = "#ffffff";
  thumbCtx.fillRect(0, 0, thumbCanvas.width, thumbCanvas.height);
  const transform = transformFor(thumbCanvas);
  state.entities.forEach((entity, index) => {
    const layer = state.layers.get(entity.layer);
    if (layer && !layer.visible) return;
    const category = effectiveCategory(entity, index);
    if (category === "Ignored") return;
    const style = LAYER_STYLE[category] || LAYER_STYLE.Other;
    thumbCtx.strokeStyle = style.color;
    thumbCtx.lineWidth = category === "Wall" ? 2 : 1;
    if (!entity.points?.length) return;
    thumbCtx.beginPath();
    entity.points.forEach((point, index) => {
      const p = toScreen(point, transform);
      if (index === 0) thumbCtx.moveTo(p.x, p.y);
      else thumbCtx.lineTo(p.x, p.y);
    });
    if (entity.closed) thumbCtx.closePath();
    thumbCtx.stroke();
  });
}

function updateMeta() {
  const unitText = state.unit?.normalized ? `${state.unit.label}→m` : (state.unit?.label || "m");
  document.getElementById("projectTitle").textContent = `${state.projectName} 분석`;
  document.getElementById("drawingMeta").textContent = `엔티티 ${state.entities.length}개 · 레이어 ${state.layers.size}개 · 콘텐츠 ${state.contents.length}개 · 단위 ${unitText} · ${state.spaceType}`;
}

function updateAnalysis() {
  const metrics = analysisMetrics().sort((a, b) => b.congestion - a.congestion);
  const worst = metrics[0];
  const totalStay = metrics.reduce((sum, metric) => sum + metric.visits * metric.duration, 0);
  const avgStay = totalStay / Math.max(1, metrics.reduce((sum, metric) => sum + metric.visits, 0));
  const routeLoad = state.personas
    .filter((persona) => state.activePersonas.has(persona.key))
    .map((persona) => `${persona.label} ${persona.weight}%`)
    .join(" · ");

  document.getElementById("statsGrid").innerHTML = `
    <div class="stat"><small>관람객</small><strong>${formatNumber.format(state.visitors)}</strong></div>
    <div class="stat"><small>평균 체류</small><strong>${avgStay.toFixed(1)}분</strong></div>
    <div class="stat"><small>병목 후보</small><strong>${worst ? worst.id : "-"}</strong></div>
    <div class="stat"><small>혼잡지수</small><strong>${worst ? worst.congestion.toFixed(2) : "0.00"}</strong></div>
  `;

  const prompt = document.getElementById("agentPrompt").value.trim();
  const sentences = makeAgentSentences(metrics, routeLoad, prompt);
  document.getElementById("agentOutput").innerHTML = sentences.map((item) => `<p>${item}</p>`).join("");
  document.getElementById("insightList").innerHTML = makeInsights(metrics).map((item) => `
    <div class="insight"><strong>${item.title}</strong>${item.body}</div>
  `).join("");
  renderPersonaMatrix();
}

function buildAiPayload() {
  const metrics = analysisMetrics().sort((a, b) => b.congestion - a.congestion);
  const matrix = (typeof personaContentMatrix === "function" ? personaContentMatrix() : []);
  return {
    spaceType: state.spaceType,
    visitors: state.visitors,
    unit: state.unit?.label || "m",
    personas: state.personas
      .filter((p) => state.activePersonas.has(p.key))
      .map((p) => ({ label: p.label, weight: p.weight, speed: p.speed, prefers: p.prefers })),
    contents: metrics.map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
      area_m2: Number(m.area?.toFixed?.(1) ?? m.area),
      duration_min: Number(m.duration?.toFixed?.(1) ?? m.duration),
      visits: m.visits,
      congestion: Number(m.congestion?.toFixed?.(2) ?? m.congestion),
    })),
    matrix: matrix.map((row) => ({
      id: row.id,
      type: row.type,
      congestion: Number(row.congestion.toFixed(1)),
      shares: row.shares.map((s) => ({ persona: s.label, share: s.share })),
      recommendation: row.recommendation,
    })),
    bottlenecks: metrics.slice(0, 5).map((m) => ({ id: m.id, name: m.name, type: m.type, congestion: Number(m.congestion?.toFixed?.(2) ?? m.congestion) })),
  };
}

async function requestAiAnalysis() {
  const output = document.getElementById("agentOutput");
  const button = document.getElementById("askAgent");
  const prompt = document.getElementById("agentPrompt").value.trim();
  const metrics = analysisMetrics();
  if (!metrics.length) {
    updateAnalysis();
    return;
  }

  const deep = document.getElementById("aiDeepMode")?.checked;
  const previousLabel = button.textContent;
  button.disabled = true;
  button.textContent = "분석 중…";
  output.innerHTML = `<p class="ai-loading">EX_AI Agent가 시뮬레이션 데이터를 해석하고 있습니다… ${deep ? "(정밀 분석, 최대 30초)" : "(빠른 분석, 약 10초)"}</p>`;

  try {
    const response = await fetch("/api/ai/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysis: buildAiPayload(), prompt, mode: deep ? "deep" : "fast" }),
    });
    const result = await response.json().catch(() => ({}));
    if (response.ok && result.ok && result.analysis) {
      const paragraphs = result.analysis
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean)
        .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
        .join("");
      output.innerHTML = `${paragraphs}<p class="ai-badge">⌁ Claude ${escapeHtml(result.model || "")} 분석</p>`;
    } else {
      renderLocalAnalysis(metrics, prompt, result.error);
    }
  } catch (error) {
    renderLocalAnalysis(metrics, prompt, error.message);
  } finally {
    button.disabled = false;
    button.textContent = previousLabel;
  }
}

function renderLocalAnalysis(metrics, prompt, note) {
  const routeLoad = state.personas
    .filter((persona) => state.activePersonas.has(persona.key))
    .map((persona) => `${persona.label} ${persona.weight}%`)
    .join(" · ");
  const sentences = makeAgentSentences(metrics.slice().sort((a, b) => b.congestion - a.congestion), routeLoad, prompt);
  // 서버가 없는 데모/단일파일 환경(네트워크 실패·미설정)에서는 친절한 안내로 대체.
  const noServer = !note || /fetch|network|501|404|설정되지/i.test(note);
  const noteHtml = noServer
    ? '<p class="ai-badge">데모 모드 — 로컬 규칙 기반 분석입니다. 실시간 Claude AI 분석은 서버 실행 버전에서 활성화됩니다.</p>'
    : `<p class="ai-badge">로컬 분석으로 대체됨 — ${escapeHtml(note)}</p>`;
  document.getElementById("agentOutput").innerHTML = sentences.map((item) => `<p>${item}</p>`).join("") + noteHtml;
}

function makeAgentSentences(metrics, routeLoad, prompt) {
  if (!metrics.length) {
    return [
      "입구와 출구가 아직 지정되지 않았습니다.",
      "상단의 입구지정, 출구지정을 누른 뒤 도면 위 위치를 찍으면 내부 주동선이 자동으로 생성됩니다.",
      "전시물 체류 히트맵까지 보려면 자동콘텐츠를 누르거나 객체를 클릭해서 Panel, Media, Diorama, Showcase, Kiosk, Interactive 중 하나로 지정하면 됩니다.",
    ];
  }
  const worst = metrics[0];
  const second = metrics[1];
  const routeOnly = metrics.every((metric) => metric.type === "Route");
  const mediaLoad = metrics.filter((metric) => metric.type.includes("Media")).reduce((sum, metric) => sum + metric.congestion, 0);
  const interactiveLoad = metrics.filter((metric) => metric.type === "Interactive" || metric.type === "Kiosk").reduce((sum, metric) => sum + metric.congestion, 0);
  const sentences = [];
  sentences.push(`현재 ${state.spaceType} 시나리오는 ${routeLoad} 기준으로 계산했습니다.`);
  if (routeOnly) {
    sentences.push("입구와 출구만으로 내부 주동선을 자동 추정했습니다. 콘텐츠를 지정하지 않은 상태에서는 동선 샘플 구간별 관람객 밀도를 기준으로 히트맵과 병목 후보를 표시합니다.");
  }
  if (worst) {
    const stayText = routeOnly ? "통과 밀도" : `평균 ${worst.duration.toFixed(1)}분 체류`;
    sentences.push(`${worst.name}(${worst.type}) 주변이 가장 높은 정체 후보입니다. ${stayText}와 예상 ${formatNumber.format(worst.visits)}명 유입이 겹쳐 붉은 히트맵으로 표시됩니다.`);
  }
  if (second) {
    sentences.push(`${second.name}은 보조 병목입니다. 입구에서 출구로 이어지는 주동선과 콘텐츠 체류 반경이 만나는 지점이면 대기 라인이나 우회 동선을 분리하는 편이 좋습니다.`);
  }
  if (routeOnly) {
    sentences.push("다음 단계로 자동콘텐츠를 누르거나 주요 전시물을 직접 클릭 지정하면 체류시간 기반 히트맵으로 전환됩니다.");
    if (prompt) {
      sentences.push(`요청 반영: "${escapeHtml(prompt)}" 관점에서는 주동선이 꺾이는 지점의 폭을 넓히고, 입구 직후 안내 그래픽으로 관람 흐름을 먼저 분산하는 방향을 권장합니다.`);
    }
    return sentences;
  }
  if (mediaLoad > interactiveLoad) {
    sentences.push("영상 콘텐츠 부하가 체험 콘텐츠보다 큽니다. Full-run의 50%만 보아도 메시지가 전달되도록 초반 30초 안에 핵심 장면을 배치하세요.");
  } else {
    sentences.push("체험형 콘텐츠 부하가 높습니다. 조작 시간을 짧게 나누고 관람자 2~3명이 동시에 이해할 수 있는 보조 그래픽을 가까운 벽면에 두는 구성이 유리합니다.");
  }
  if (prompt) {
    sentences.push(`요청 반영: "${escapeHtml(prompt)}" 관점에서는 병목 콘텐츠의 전면 체류 영역을 넓히고, 대기 관람객이 다음 콘텐츠를 미리 읽을 수 있는 프리뷰 패널을 배치하는 방향을 권장합니다.`);
  }
  return sentences;
}

function makeInsights(metrics) {
  const top = metrics.slice(0, 3);
  const low = metrics.filter((metric) => metric.congestion < 0.8).slice(0, 1);
  const insights = top.map((metric, index) => ({
    title: `${index + 1}. ${metric.name}`,
    body: ` · ${metric.type}, 혼잡지수 ${metric.congestion.toFixed(2)}, 예상 방문 ${formatNumber.format(metric.visits)}명`,
  }));
  if (low[0]) {
    insights.push({
      title: "휴식/완충 후보",
      body: ` · ${low[0].name} 주변은 상대적으로 밀도가 낮아 휴식존 또는 전환 연출에 적합합니다.`,
    });
  }
  return insights;
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function exportProject() {
  const project = {
    version: "0.1.0",
    savedAt: new Date().toISOString(),
    projectName: state.projectName,
    spaceType: state.spaceType,
    visitors: state.visitors,
    entities: state.entities,
    entityOverrides: state.entityOverrides,
    personas: state.personas,
    durations: state.durations,
    filters: state.filters,
    unit: state.unit,
    entrancePoint: state.entrancePoint,
    exitPoint: state.exitPoint,
  };
  const fileName = `${datePrefix()}_${state.projectName}.exc`;
  const zipBlob = createStoredZip(fileName, JSON.stringify(project, null, 2));
  download(zipBlob, `${datePrefix()}_${state.projectName}.zip`);
}

async function handleProjectImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  const buffer = await file.arrayBuffer();
  let text = "";
  if (file.name.toLowerCase().endsWith(".zip")) {
    text = unzipFirstText(buffer);
  } else {
    text = new TextDecoder().decode(buffer);
  }
  try {
    const project = JSON.parse(text);
    state.projectName = project.projectName || file.name.replace(/\.(zip|exc|json)$/i, "");
    state.spaceType = project.spaceType || state.spaceType;
    state.visitors = project.visitors || state.visitors;
    state.entities = project.entities || state.entities;
    state.unit = project.unit || inferUnitFromBounds(state.entities);
    if (!project.unit) {
      const normalized = normalizeEntitiesToMeters(state.entities, state.unit);
      state.entities = normalized.entities;
      state.unit = normalized.unit;
    }
    state.entityOverrides = project.entityOverrides || {};
    state.selectedEntityIndex = null;
    state.entrancePoint = project.entrancePoint || null;
    state.exitPoint = project.exitPoint || null;
    state.routePickMode = null;
    resetAutoView();
    state.personas = project.personas || state.personas;
    state.durations = project.durations || state.durations;
    state.filters = project.filters || state.filters;
    document.getElementById("spaceType").value = state.spaceType;
    document.getElementById("visitorSlider").value = state.visitors;
    document.getElementById("visitorValue").textContent = `${formatNumber.format(state.visitors)}명`;
    deriveContentsFromEntities();
    computeLayers();
    renderEditors();
    updateAll();
  } catch {
    alert("프로젝트 파일을 읽을 수 없습니다.");
  }
}

function exportCsv() {
  const metrics = analysisMetrics();
  const rows = [
    ["id", "name", "type", "layer", "visits", "duration_min", "congestion", "x_m", "y_m"],
    ...metrics.map((metric) => [
      metric.id,
      metric.name,
      metric.type,
      metric.layer,
      metric.visits,
      metric.duration.toFixed(2),
      metric.congestion.toFixed(3),
      metric.x.toFixed(2),
      metric.y.toFixed(2),
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  download(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }), `${datePrefix()}_${state.projectName}_analysis.csv`);
}

function csvCell(value) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function exportPng() {
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = 1600;
  exportCanvas.height = 1000;
  const exportCtx = exportCanvas.getContext("2d");
  const previousSize = { width: canvas.width, height: canvas.height };
  draw({ context: exportCtx, canvas: exportCanvas, transparent: true });
  exportCanvas.toBlob((blob) => download(blob, `${datePrefix()}_${state.projectName}_heatmap.png`), "image/png");
  canvas.width = previousSize.width;
  canvas.height = previousSize.height;
  updateAll();
}

function exportPdf() {
  const metrics = analysisMetrics().sort((a, b) => b.congestion - a.congestion);
  if (!metrics.length) {
    alert("리포트로 내보낼 분석 결과가 없습니다. 먼저 콘텐츠를 분류하거나 입구·출구를 지정해주세요.");
    return;
  }

  // Capture the current heatmap as a high-res PNG for the report header image.
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = 1600;
  exportCanvas.height = 1000;
  const exportCtx = exportCanvas.getContext("2d");
  exportCtx.fillStyle = "#ffffff";
  exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  const previousMode = state.mode;
  state.mode = "analysis";
  draw({ context: exportCtx, canvas: exportCanvas });
  state.mode = previousMode;
  const heatmapDataUrl = exportCanvas.toDataURL("image/png");

  const matrix = (typeof personaContentMatrix === "function" ? personaContentMatrix() : [])
    .slice()
    .sort((a, b) => b.congestion - a.congestion);
  const routeOnly = metrics.every((metric) => metric.type === "Route");
  const avgStay = metrics.reduce((sum, m) => sum + m.visits * m.duration, 0) / Math.max(1, metrics.reduce((sum, m) => sum + m.visits, 0));
  const worst = metrics[0];
  const personaSummary = state.personas
    .filter((p) => state.activePersonas.has(p.key))
    .map((p) => `${p.label} ${p.weight}%`)
    .join(" · ");

  // Use whatever the AI/local panel currently shows as the recommendation block.
  const agentHtml = document.getElementById("agentOutput")?.innerHTML
    || makeAgentSentences(metrics, personaSummary, "").map((s) => `<p>${s}</p>`).join("");

  const bottleneckRows = metrics.slice(0, 8).map((m, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(m.name)}</td>
      <td>${escapeHtml(LAYER_STYLE[m.type]?.label || m.type)}</td>
      <td class="num">${formatNumber.format(m.visits)}</td>
      <td class="num">${m.duration.toFixed(1)}분</td>
      <td class="num ${m.congestion >= 12 ? "hot" : m.congestion >= 5 ? "mid" : "low"}">${m.congestion.toFixed(2)}</td>
    </tr>`).join("");

  const matrixHeaders = state.personas.map((p) => `<th>${escapeHtml(p.label)}</th>`).join("");
  const matrixRows = matrix.slice(0, 12).map((row) => {
    const cells = state.personas.map((p) => {
      const cell = row.shares.find((s) => s.key === p.key);
      return `<td class="num">${cell ? cell.share : 0}%</td>`;
    }).join("");
    return `<tr><td>${escapeHtml(row.id)} <span class="muted">${escapeHtml(LAYER_STYLE[row.type]?.label || row.type)}</span></td>${cells}<td class="num ${row.congestion >= 12 ? "hot" : row.congestion >= 5 ? "mid" : "low"}">${row.congestion.toFixed(1)}</td><td class="rec">${escapeHtml(row.recommendation)}</td></tr>`;
  }).join("");

  const reportDate = new Date().toLocaleString("ko-KR");
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<title>${escapeHtml(state.projectName)} 분석 리포트</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", sans-serif; color: #1f2937; margin: 0; padding: 32px 36px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #6b7280; font-size: 13px; margin-bottom: 18px; }
  .meta { display: flex; flex-wrap: wrap; gap: 10px 24px; margin: 0 0 18px; font-size: 13px; }
  .meta b { color: #0f766e; }
  .stats { display: flex; gap: 12px; margin: 0 0 20px; }
  .stat { flex: 1; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; }
  .stat small { display: block; color: #6b7280; font-size: 11px; }
  .stat strong { font-size: 19px; }
  h2 { font-size: 15px; margin: 22px 0 8px; border-left: 4px solid #0f766e; padding-left: 8px; }
  img.heat { width: 100%; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border-bottom: 1px solid #eceff1; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f7f8f5; font-weight: 600; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.hot { color: #d7191c; font-weight: 700; }
  td.mid { color: #f59e0b; font-weight: 600; }
  td.low { color: #41ab5d; }
  td.rec { font-size: 11px; color: #4b5563; }
  .muted { color: #9ca3af; font-size: 11px; }
  .agent p { margin: 0 0 7px; font-size: 13px; line-height: 1.5; }
  .agent .ai-badge { color: #9ca3af; font-size: 11px; }
  .foot { margin-top: 24px; color: #9ca3af; font-size: 11px; border-top: 1px solid #e5e7eb; padding-top: 8px; }
  @media print { body { padding: 0; } @page { margin: 14mm; } }
</style></head><body>
  <h1>${escapeHtml(state.projectName)} — 관람자 행태 분석 리포트</h1>
  <div class="sub">EX_AI Agent PRO · ${escapeHtml(reportDate)}</div>
  <div class="meta">
    <span>공간 유형 <b>${escapeHtml(state.spaceType)}</b></span>
    <span>관람객 <b>${formatNumber.format(state.visitors)}명</b></span>
    <span>페르소나 <b>${escapeHtml(personaSummary)}</b></span>
  </div>
  <div class="stats">
    <div class="stat"><small>평균 체류</small><strong>${avgStay.toFixed(1)}분</strong></div>
    <div class="stat"><small>병목 후보</small><strong>${worst ? escapeHtml(worst.id) : "-"}</strong></div>
    <div class="stat"><small>최대 혼잡지수</small><strong>${worst ? worst.congestion.toFixed(2) : "0.00"}</strong></div>
    <div class="stat"><small>콘텐츠 수</small><strong>${metrics.length}</strong></div>
  </div>
  <h2>히트맵</h2>
  <img class="heat" src="${heatmapDataUrl}" alt="히트맵">
  <h2>${routeOnly ? "혼잡 동선 구간" : "혼잡 콘텐츠 순위"}</h2>
  <table><thead><tr><th>#</th><th>이름</th><th>유형</th><th>예상 방문</th><th>평균 체류</th><th>혼잡지수</th></tr></thead><tbody>${bottleneckRows}</tbody></table>
  ${matrixRows ? `<h2>페르소나×콘텐츠 매트릭스</h2>
  <table><thead><tr><th>콘텐츠</th>${matrixHeaders}<th>혼잡</th><th>권고</th></tr></thead><tbody>${matrixRows}</tbody></table>` : ""}
  <h2>EX_AI Agent 제안</h2>
  <div class="agent">${agentHtml}</div>
  <div class="foot">본 리포트는 EX_AI Agent PRO 시뮬레이션 결과이며, 실제 관람객 행동과 차이가 있을 수 있습니다.</div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 350); };<\/script>
</body></html>`;

  const reportWindow = window.open("", "_blank");
  if (!reportWindow) {
    alert("팝업이 차단되어 리포트를 열 수 없습니다. 팝업 허용 후 다시 시도해주세요.");
    return;
  }
  reportWindow.document.open();
  reportWindow.document.write(html);
  reportWindow.document.close();
}

function createStoredZip(fileName, text) {
  const encoder = new TextEncoder();
  const name = encoder.encode(fileName);
  const data = encoder.encode(text);
  const crc = crc32(data);
  const localHeader = new Uint8Array(30 + name.length);
  const local = new DataView(localHeader.buffer);
  local.setUint32(0, 0x04034b50, true);
  local.setUint16(4, 20, true);
  local.setUint16(8, 0, true);
  local.setUint32(14, crc, true);
  local.setUint32(18, data.length, true);
  local.setUint32(22, data.length, true);
  local.setUint16(26, name.length, true);
  localHeader.set(name, 30);

  const central = new Uint8Array(46 + name.length);
  const cd = new DataView(central.buffer);
  cd.setUint32(0, 0x02014b50, true);
  cd.setUint16(4, 20, true);
  cd.setUint16(6, 20, true);
  cd.setUint32(16, crc, true);
  cd.setUint32(20, data.length, true);
  cd.setUint32(24, data.length, true);
  cd.setUint16(28, name.length, true);
  cd.setUint32(42, 0, true);
  central.set(name, 46);

  const end = new Uint8Array(22);
  const eocd = new DataView(end.buffer);
  eocd.setUint32(0, 0x06054b50, true);
  eocd.setUint16(8, 1, true);
  eocd.setUint16(10, 1, true);
  eocd.setUint32(12, central.length, true);
  eocd.setUint32(16, localHeader.length + data.length, true);
  return new Blob([localHeader, data, central, end], { type: "application/zip" });
}

function unzipFirstText(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x04034b50) throw new Error("Not a local zip header");
  const compressedSize = view.getUint32(18, true);
  const nameLength = view.getUint16(26, true);
  const extraLength = view.getUint16(28, true);
  const start = 30 + nameLength + extraLength;
  return new TextDecoder().decode(bytes.slice(start, start + compressedSize));
}

function crc32(data) {
  let crc = -1;
  for (let i = 0; i < data.length; i += 1) {
    crc ^= data[i];
    for (let j = 0; j < 8; j += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function datePrefix() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(now.getMonth() + 1)}.${pad(now.getDate())}.${pad(now.getHours())}`;
}

function download(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

init();
