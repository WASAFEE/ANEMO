import {
  WindControlPoint,
  WindField,
  WindVector,
  componentsFromPolar,
  createWindField,
  interpolateWind,
  pointFromPolar,
  pointFromScreenDrag,
  polarFromComponents,
  updateWindField,
  validateWindField,
  windFieldToCsv,
} from "./wind-field.js";

interface EditorState {
  name: string;
  interpolationPower: number;
  points: WindControlPoint[];
}

type EditorMode = "draw" | "pan";
type StatusKind = "info" | "success" | "error";

const AUTOSAVE_KEY = "wasafee.anemo.wind-field.v1";
const PIXELS_PER_MPS = 12;
const MAX_DRAW_SPEED_MPS = 30;
const MIN_DRAG_PIXELS = 8;
const CONTROL_COLOR = "#126a4b";
const SELECTED_COLOR = "#b76a00";
const PREVIEW_COLOR = "#3f72af";

const statusElement = getElement<HTMLDivElement>("status");
const fieldNameInput = getElement<HTMLInputElement>("field-name");
const drawModeButton = getElement<HTMLButtonElement>("draw-mode");
const panModeButton = getElement<HTMLButtonElement>("pan-mode");
const modeHelp = getElement<HTMLParagraphElement>("mode-help");
const undoButton = getElement<HTMLButtonElement>("undo");
const redoButton = getElement<HTMLButtonElement>("redo");
const clearButton = getElement<HTMLButtonElement>("clear");
const selectedPanel = getElement<HTMLElement>("selected-panel");
const selectedLatitude = getElement<HTMLElement>("selected-latitude");
const selectedLongitude = getElement<HTMLElement>("selected-longitude");
const selectedSpeedInput = getElement<HTMLInputElement>("selected-speed");
const selectedDirectionInput = getElement<HTMLInputElement>("selected-direction");
const selectedAltitudeInput = getElement<HTMLInputElement>("selected-altitude");
const deleteSelectedButton = getElement<HTMLButtonElement>("delete-selected");
const interpolationPowerSelect = getElement<HTMLSelectElement>("interpolation-power");
const exampleButton = getElement<HTMLButtonElement>("example");
const exportJsonButton = getElement<HTMLButtonElement>("export-json");
const exportCsvButton = getElement<HTMLButtonElement>("export-csv");
const importJsonButton = getElement<HTMLButtonElement>("import-json");
const importFileInput = getElement<HTMLInputElement>("import-file");
const databaseStatus = getElement<HTMLParagraphElement>("database-status");
const measurementGroupInput = getElement<HTMLInputElement>("measurement-group-id");
const measuredAtInput = getElement<HTMLInputElement>("measured-at");
const saveDatabaseButton = getElement<HTMLButtonElement>("save-database");
const pointCount = getElement<HTMLElement>("point-count");
const pointTableBody = getElement<HTMLTableSectionElement>("point-table-body");

let baseField = createWindField("新しい風場", []);
let state: EditorState = {
  name: baseField.name,
  interpolationPower: baseField.interpolation.power,
  points: [],
};
let history: EditorState[] = [];
let future: EditorState[] = [];
let selectedPointId: string | null = null;
let mode: EditorMode = "draw";
let databaseConfigured = false;
let pointSequence = 1;

const map = L.map("map", {
  center: [35.681236, 139.767125],
  zoom: 14,
  zoomControl: true,
  preferCanvas: true,
});

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
  maxZoom: 19,
  crossOrigin: true,
}).addTo(map);

const controlPointLayer = L.layerGroup().addTo(map);
const interpolatedLayer = L.layerGroup().addTo(map);
const temporaryLayer = L.layerGroup().addTo(map);
const mapContainer = map.getContainer();

interface DrawingState {
  pointerId: number;
  startPoint: L.Point;
  startLatLng: L.LatLng;
}

let drawing: DrawingState | null = null;
let previewAnimationFrame: number | null = null;

restoreAutosave();
bindControls();
setMode("draw");
initializeDatabaseControls();
renderAll();
void checkDatabaseStatus();

function bindControls(): void {
  drawModeButton.addEventListener("click", () => setMode("draw"));
  panModeButton.addEventListener("click", () => setMode("pan"));
  undoButton.addEventListener("click", undo);
  redoButton.addEventListener("click", redo);
  clearButton.addEventListener("click", clearAll);
  deleteSelectedButton.addEventListener("click", deleteSelectedPoint);
  exampleButton.addEventListener("click", loadExample);
  exportJsonButton.addEventListener("click", exportJson);
  exportCsvButton.addEventListener("click", exportCsv);
  importJsonButton.addEventListener("click", () => importFileInput.click());
  importFileInput.addEventListener("change", () => void importJsonFile());
  saveDatabaseButton.addEventListener("click", () => void saveToDatabase());

  fieldNameInput.addEventListener("change", () => {
    const nextName = fieldNameInput.value.trim();
    if (!nextName) {
      fieldNameInput.value = state.name;
      showStatus("風場の名前を入力してください。", "error");
      return;
    }
    if (nextName !== state.name) {
      commit({ ...state, name: nextName }, "風場の名前を変更しました。");
    }
  });

  interpolationPowerSelect.addEventListener("change", () => {
    const power = Number(interpolationPowerSelect.value);
    commit(
      { ...state, interpolationPower: power },
      "補間設定を変更しました。",
    );
  });

  for (const input of [
    selectedSpeedInput,
    selectedDirectionInput,
    selectedAltitudeInput,
  ]) {
    input.addEventListener("change", updateSelectedPointFromForm);
  }

  mapContainer.addEventListener("pointerdown", onPointerDown, true);
  mapContainer.addEventListener("pointermove", onPointerMove, true);
  mapContainer.addEventListener("pointerup", onPointerUp, true);
  mapContainer.addEventListener("pointercancel", cancelDrawing, true);
  map.on("moveend zoomend resize", schedulePreviewRender);
}

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Required element #${id} was not found`);
  }
  return element as T;
}

function cloneState(value: EditorState): EditorState {
  return {
    name: value.name,
    interpolationPower: value.interpolationPower,
    points: value.points.map((point) => ({ ...point })),
  };
}

function currentField(): WindField {
  return updateWindField(
    baseField,
    state.name,
    state.points,
    state.interpolationPower,
  );
}

function commit(nextState: EditorState, message: string): void {
  history.push(cloneState(state));
  if (history.length > 100) {
    history.shift();
  }
  future = [];
  state = cloneState(nextState);
  if (selectedPointId
      && !state.points.some((point) => point.id === selectedPointId)) {
    selectedPointId = null;
  }
  persistAutosave();
  renderAll();
  showStatus(message, "success");
}

function undo(): void {
  const previous = history.pop();
  if (!previous) {
    return;
  }
  future.push(cloneState(state));
  state = previous;
  if (selectedPointId
      && !state.points.some((point) => point.id === selectedPointId)) {
    selectedPointId = null;
  }
  persistAutosave();
  renderAll();
  showStatus("1つ前の状態に戻しました。", "info");
}

function redo(): void {
  const next = future.pop();
  if (!next) {
    return;
  }
  history.push(cloneState(state));
  state = next;
  persistAutosave();
  renderAll();
  showStatus("操作をやり直しました。", "info");
}

function setMode(nextMode: EditorMode): void {
  mode = nextMode;
  const drawingMode = mode === "draw";
  drawModeButton.setAttribute("aria-pressed", String(drawingMode));
  panModeButton.setAttribute("aria-pressed", String(!drawingMode));
  mapContainer.classList.toggle("draw-mode", drawingMode);
  modeHelp.textContent = drawingMode
    ? "地図上で、風が吹いていく向きへドラッグします。矢印が長いほど風速が大きくなります。"
    : "ドラッグで地図を移動し、ホイールまたはボタンで拡大・縮小できます。";
  if (drawingMode) {
    map.dragging.disable();
    map.doubleClickZoom.disable();
  } else {
    cancelDrawing();
    map.dragging.enable();
    map.doubleClickZoom.enable();
  }
}

function onPointerDown(event: PointerEvent): void {
  if (mode !== "draw" || event.button !== 0 || !event.isPrimary) {
    return;
  }
  const target = event.target;
  if (target instanceof Element && target.closest(".leaflet-control")) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  const point = map.mouseEventToContainerPoint(event);
  drawing = {
    pointerId: event.pointerId,
    startPoint: point,
    startLatLng: map.containerPointToLatLng(point),
  };
  mapContainer.setPointerCapture(event.pointerId);
  temporaryLayer.clearLayers();
}

function onPointerMove(event: PointerEvent): void {
  if (!drawing || drawing.pointerId !== event.pointerId) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  const currentPoint = map.mouseEventToContainerPoint(event);
  const deltaX = currentPoint.x - drawing.startPoint.x;
  const deltaY = currentPoint.y - drawing.startPoint.y;
  const previewPoint = pointFromScreenDrag(
    "preview",
    drawing.startLatLng.lat,
    drawing.startLatLng.lng,
    deltaX,
    deltaY,
    PIXELS_PER_MPS,
    MAX_DRAW_SPEED_MPS,
  );
  temporaryLayer.clearLayers();
  addArrow(temporaryLayer, drawing.startLatLng, previewPoint, {
    color: SELECTED_COLOR,
    pixelsPerMps: PIXELS_PER_MPS,
    maxLengthPixels: MAX_DRAW_SPEED_MPS * PIXELS_PER_MPS,
    weight: 4,
    opacity: 0.9,
    interactive: false,
    showAnchor: true,
  });
}

function onPointerUp(event: PointerEvent): void {
  if (!drawing || drawing.pointerId !== event.pointerId) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  const currentPoint = map.mouseEventToContainerPoint(event);
  const deltaX = currentPoint.x - drawing.startPoint.x;
  const deltaY = currentPoint.y - drawing.startPoint.y;
  const distancePixels = Math.hypot(deltaX, deltaY);
  const startLatLng = drawing.startLatLng;
  finishPointerCapture(event.pointerId);
  temporaryLayer.clearLayers();
  drawing = null;

  if (distancePixels < MIN_DRAG_PIXELS) {
    showStatus("もう少し長くドラッグすると風を追加できます。", "info");
    return;
  }

  const id = nextPointId();
  const point = pointFromScreenDrag(
    id,
    startLatLng.lat,
    startLatLng.lng,
    deltaX,
    deltaY,
    PIXELS_PER_MPS,
    MAX_DRAW_SPEED_MPS,
  );
  selectedPointId = id;
  commit(
    { ...state, points: [...state.points, point] },
    `風 ${id} を追加しました。`,
  );
}

function cancelDrawing(): void {
  if (drawing) {
    finishPointerCapture(drawing.pointerId);
  }
  drawing = null;
  temporaryLayer.clearLayers();
}

function finishPointerCapture(pointerId: number): void {
  if (mapContainer.hasPointerCapture(pointerId)) {
    mapContainer.releasePointerCapture(pointerId);
  }
}

function nextPointId(): string {
  while (state.points.some((point) => point.id === `p${pointSequence}`)) {
    pointSequence += 1;
  }
  const id = `p${pointSequence}`;
  pointSequence += 1;
  return id;
}

interface ArrowOptions {
  color: string;
  pixelsPerMps: number;
  maxLengthPixels: number;
  weight: number;
  opacity: number;
  interactive: boolean;
  showAnchor: boolean;
  onSelect?: () => void;
}

function addArrow(
  layer: L.LayerGroup,
  anchor: L.LatLng,
  vector: WindVector,
  options: ArrowOptions,
): void {
  const horizontalSpeed = Math.hypot(vector.north_mps, vector.east_mps);
  const origin = map.latLngToContainerPoint(anchor);
  const rawLength = horizontalSpeed * options.pixelsPerMps;
  const length = Math.min(options.maxLengthPixels, rawLength);

  if (options.showAnchor) {
    const marker = L.circleMarker(anchor, {
      radius: options.interactive ? 5 : 3,
      color: options.color,
      fillColor: "#ffffff",
      fillOpacity: 1,
      weight: options.weight,
      interactive: options.interactive,
    }).addTo(layer);
    bindArrowSelection(marker, options);
  }

  if (horizontalSpeed < 0.01 || length < 1) {
    return;
  }

  const unitX = vector.east_mps / horizontalSpeed;
  const unitY = -vector.north_mps / horizontalSpeed;
  const endPoint = L.point(
    origin.x + unitX * length,
    origin.y + unitY * length,
  );
  const endLatLng = map.containerPointToLatLng(endPoint);
  const line = L.polyline([anchor, endLatLng], {
    color: options.color,
    weight: options.weight,
    opacity: options.opacity,
    interactive: options.interactive,
  }).addTo(layer);
  bindArrowSelection(line, options);

  const headLength = Math.min(10, Math.max(5, length * 0.28));
  const headWidth = headLength * 0.62;
  const leftPoint = L.point(
    endPoint.x - unitX * headLength - unitY * headWidth,
    endPoint.y - unitY * headLength + unitX * headWidth,
  );
  const rightPoint = L.point(
    endPoint.x - unitX * headLength + unitY * headWidth,
    endPoint.y - unitY * headLength - unitX * headWidth,
  );
  for (const headPoint of [leftPoint, rightPoint]) {
    const head = L.polyline(
      [endLatLng, map.containerPointToLatLng(headPoint)],
      {
        color: options.color,
        weight: options.weight,
        opacity: options.opacity,
        interactive: options.interactive,
      },
    ).addTo(layer);
    bindArrowSelection(head, options);
  }
}

function bindArrowSelection(layer: L.Layer, options: ArrowOptions): void {
  if (!options.interactive || !options.onSelect) {
    return;
  }
  layer.on("click", (event: L.LeafletMouseEvent) => {
    L.DomEvent.stopPropagation(event.originalEvent);
    options.onSelect?.();
  });
}

function renderAll(): void {
  fieldNameInput.value = state.name;
  interpolationPowerSelect.value = String(state.interpolationPower);
  undoButton.disabled = history.length === 0;
  redoButton.disabled = future.length === 0;
  clearButton.disabled = state.points.length === 0;
  exportJsonButton.disabled = state.points.length === 0;
  exportCsvButton.disabled = state.points.length === 0;
  saveDatabaseButton.disabled = !databaseConfigured || state.points.length === 0;
  pointCount.textContent = `制御点 ${state.points.length}点`;
  renderSelectedPanel();
  renderTable();
  renderInterpolatedField();
  renderControlPoints();
}

function renderControlPoints(): void {
  controlPointLayer.clearLayers();
  for (const point of state.points) {
    const selected = point.id === selectedPointId;
    addArrow(
      controlPointLayer,
      L.latLng(point.latitude_deg, point.longitude_deg),
      point,
      {
        color: selected ? SELECTED_COLOR : CONTROL_COLOR,
        pixelsPerMps: PIXELS_PER_MPS,
        maxLengthPixels: 160,
        weight: selected ? 4 : 3,
        opacity: 0.95,
        interactive: true,
        showAnchor: true,
        onSelect: () => selectPoint(point.id),
      },
    );
  }
}

function renderInterpolatedField(): void {
  interpolatedLayer.clearLayers();
  if (state.points.length === 0) {
    return;
  }

  const size = map.getSize();
  const spacing = size.x < 700 ? 90 : 105;
  for (let y = spacing / 2; y < size.y; y += spacing) {
    for (let x = spacing / 2; x < size.x; x += spacing) {
      const location = map.containerPointToLatLng(L.point(x, y));
      const vector = interpolateWind(
        state.points,
        location.lat,
        location.lng,
        state.interpolationPower,
      );
      if (Math.hypot(vector.north_mps, vector.east_mps) < 0.05) {
        continue;
      }
      addArrow(interpolatedLayer, location, vector, {
        color: PREVIEW_COLOR,
        pixelsPerMps: 7,
        maxLengthPixels: 64,
        weight: 2,
        opacity: 0.58,
        interactive: false,
        showAnchor: false,
      });
    }
  }
}

function schedulePreviewRender(): void {
  if (previewAnimationFrame !== null) {
    cancelAnimationFrame(previewAnimationFrame);
  }
  previewAnimationFrame = requestAnimationFrame(() => {
    previewAnimationFrame = null;
    renderInterpolatedField();
    renderControlPoints();
  });
}

function selectPoint(id: string): void {
  selectedPointId = id;
  renderControlPoints();
  renderSelectedPanel();
  renderTable();
  const point = state.points.find((candidate) => candidate.id === id);
  if (point) {
    map.panTo([point.latitude_deg, point.longitude_deg]);
  }
}

function renderSelectedPanel(): void {
  const point = state.points.find((candidate) => candidate.id === selectedPointId);
  selectedPanel.hidden = !point;
  if (!point) {
    return;
  }

  selectedLatitude.textContent = point.latitude_deg.toFixed(7);
  selectedLongitude.textContent = point.longitude_deg.toFixed(7);
  selectedSpeedInput.value = Math.hypot(point.north_mps, point.east_mps).toFixed(2);
  selectedDirectionInput.value = point.direction_to_deg.toFixed(1);
  selectedAltitudeInput.value = String(point.altitude_m);
}

function updateSelectedPointFromForm(): void {
  const index = state.points.findIndex((point) => point.id === selectedPointId);
  if (index < 0) {
    return;
  }

  const speed = Number(selectedSpeedInput.value);
  const direction = Number(selectedDirectionInput.value);
  const altitude = Number(selectedAltitudeInput.value);
  if (!Number.isFinite(speed) || speed < 0 || speed > MAX_DRAW_SPEED_MPS
      || !Number.isFinite(direction)
      || !Number.isFinite(altitude) || altitude < -1000 || altitude > 100000) {
    renderSelectedPanel();
    showStatus("風速、向き、高度の入力範囲を確認してください。", "error");
    return;
  }

  const previous = state.points[index];
  const vector = componentsFromPolar(speed, direction, previous.down_mps);
  const polar = polarFromComponents(vector);
  const updated: WindControlPoint = {
    ...previous,
    altitude_m: altitude,
    ...vector,
    ...polar,
  };
  const points = state.points.map((point, pointIndex) => (
    pointIndex === index ? updated : point
  ));
  commit({ ...state, points }, `風 ${previous.id} を更新しました。`);
}

function deleteSelectedPoint(): void {
  if (!selectedPointId) {
    return;
  }
  const id = selectedPointId;
  selectedPointId = null;
  commit(
    { ...state, points: state.points.filter((point) => point.id !== id) },
    `風 ${id} を削除しました。`,
  );
}

function clearAll(): void {
  if (state.points.length === 0) {
    return;
  }
  if (!window.confirm("入力した風をすべて削除しますか？「元に戻す」で復元できます。")) {
    return;
  }
  selectedPointId = null;
  commit({ ...state, points: [] }, "すべての風を削除しました。");
}

function renderTable(): void {
  pointTableBody.replaceChildren();
  if (state.points.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 7;
    cell.className = "empty-cell";
    cell.textContent = "風はまだありません。";
    row.append(cell);
    pointTableBody.append(row);
    return;
  }

  for (const point of state.points) {
    const row = document.createElement("tr");
    row.dataset.pointId = point.id;
    row.tabIndex = 0;
    row.classList.toggle("is-selected", point.id === selectedPointId);
    const horizontalSpeed = Math.hypot(point.north_mps, point.east_mps);
    const values = [
      point.id,
      point.latitude_deg.toFixed(7),
      point.longitude_deg.toFixed(7),
      `${horizontalSpeed.toFixed(2)} m/s`,
      `${point.direction_to_deg.toFixed(1)}°`,
      `${point.north_mps.toFixed(2)} m/s`,
      `${point.east_mps.toFixed(2)} m/s`,
    ];
    for (const value of values) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }
    row.addEventListener("click", () => selectPoint(point.id));
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectPoint(point.id);
      }
    });
    pointTableBody.append(row);
  }
}

function loadExample(): void {
  if (state.points.length > 0
      && !window.confirm("現在の風場を例に置き換えますか？")) {
    return;
  }

  const points = [
    pointFromPolar("p1", 35.6875, 139.7505, 4, 70),
    pointFromPolar("p2", 35.6890, 139.7840, 7, 125),
    pointFromPolar("p3", 35.6660, 139.7710, 3, 10),
    pointFromPolar("p4", 35.6715, 139.7440, 5.5, 310),
  ];
  baseField = createWindField("連続風場のサンプル", points);
  state = {
    name: baseField.name,
    interpolationPower: 2,
    points,
  };
  history = [];
  future = [];
  selectedPointId = null;
  pointSequence = 5;
  persistAutosave();
  renderAll();
  fitMapToPoints(points);
  showStatus("説明用の合成データを読み込みました。実測値ではありません。", "info");
}

function exportJson(): void {
  if (state.points.length === 0) {
    return;
  }
  const field = currentField();
  downloadText(
    `${safeFilename(field.name)}.anemo.json`,
    `${JSON.stringify(field, null, 2)}\n`,
    "application/json;charset=utf-8",
  );
  showStatus("ANEMO風場JSONを書き出しました。", "success");
}

function exportCsv(): void {
  if (state.points.length === 0) {
    return;
  }
  const field = currentField();
  downloadText(
    `${safeFilename(field.name)}.csv`,
    windFieldToCsv(field),
    "text/csv;charset=utf-8",
  );
  showStatus("制御点CSVを書き出しました。補間設定はJSONにのみ保存されます。", "success");
}

async function importJsonFile(): Promise<void> {
  const file = importFileInput.files?.[0];
  importFileInput.value = "";
  if (!file) {
    return;
  }
  if (file.size > 1_000_000) {
    showStatus("読み込めるJSONは1 MBまでです。", "error");
    return;
  }

  try {
    const parsed: unknown = JSON.parse(await file.text());
    const validation = validateWindField(parsed);
    if (!validation.ok || !validation.field) {
      showStatus(
        `JSONを読み込めませんでした: ${validation.errors.slice(0, 3).join(" / ")}`,
        "error",
      );
      return;
    }
    applyImportedField(validation.field);
    showStatus(`${validation.field.control_points.length}点の風場を読み込みました。`, "success");
  } catch (error) {
    showStatus(`JSONを読み込めませんでした: ${safeErrorMessage(error)}`, "error");
  }
}

function applyImportedField(field: WindField): void {
  baseField = field;
  state = {
    name: field.name,
    interpolationPower: field.interpolation.power,
    points: field.control_points.map((point) => ({ ...point })),
  };
  history = [];
  future = [];
  selectedPointId = null;
  pointSequence = 1;
  persistAutosave();
  renderAll();
  fitMapToPoints(state.points);
}

function fitMapToPoints(points: readonly WindControlPoint[]): void {
  if (points.length === 0) {
    return;
  }
  if (points.length === 1) {
    map.setView([points[0].latitude_deg, points[0].longitude_deg], 15);
    return;
  }
  const bounds = L.latLngBounds(
    points.map((point) => [point.latitude_deg, point.longitude_deg]),
  );
  map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
}

function persistAutosave(): void {
  try {
    window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(currentField()));
  } catch (error) {
    console.warn("Autosave failed:", safeErrorMessage(error));
  }
}

function restoreAutosave(): void {
  try {
    const saved = window.localStorage.getItem(AUTOSAVE_KEY);
    if (!saved) {
      showStatus("「風を追加」を選び、地図上をドラッグしてください。", "info");
      return;
    }
    const validation = validateWindField(JSON.parse(saved) as unknown);
    if (!validation.ok || !validation.field) {
      window.localStorage.removeItem(AUTOSAVE_KEY);
      showStatus("保存されていた作業データは形式が古いため読み込みませんでした。", "info");
      return;
    }
    baseField = validation.field;
    state = {
      name: validation.field.name,
      interpolationPower: validation.field.interpolation.power,
      points: validation.field.control_points.map((point) => ({ ...point })),
    };
    showStatus("前回このブラウザで作業した風場を復元しました。", "info");
  } catch (error) {
    console.warn("Autosave restore failed:", safeErrorMessage(error));
    showStatus("新しい風場を開始しました。", "info");
  }
}

function initializeDatabaseControls(): void {
  measurementGroupInput.value = String(Math.floor(Date.now() / 1000));
  const localDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
  measuredAtInput.value = localDate.toISOString().slice(0, 19);
  saveDatabaseButton.disabled = true;
}

async function checkDatabaseStatus(): Promise<void> {
  try {
    const response = await fetch("/api/health", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json() as { database?: unknown };
    databaseConfigured = data.database === "ready";
    if (databaseConfigured) {
      databaseStatus.textContent = "データベースへ接続できました。";
    } else if (data.database === "unreachable") {
      databaseStatus.textContent = "設定はありますが、データベースへ接続できません。起動状態と設定を確認してください。";
    } else {
      databaseStatus.textContent = "データベースは未設定です。JSON・CSVの書き出しはそのまま使えます。";
    }
  } catch (error) {
    databaseConfigured = false;
    databaseStatus.textContent = `接続状態を確認できません: ${safeErrorMessage(error)}`;
  }
  saveDatabaseButton.disabled = !databaseConfigured || state.points.length === 0;
}

async function saveToDatabase(): Promise<void> {
  if (!databaseConfigured || state.points.length === 0) {
    return;
  }
  const measurementGroupId = Number(measurementGroupInput.value);
  const measuredAtValue = measuredAtInput.value;
  if (!Number.isInteger(measurementGroupId)
      || measurementGroupId < 1
      || measurementGroupId > 2_147_483_647
      || !measuredAtValue) {
    showStatus("測定グループIDと日時を確認してください。", "error");
    return;
  }

  saveDatabaseButton.disabled = true;
  try {
    const response = await fetch("/api/wind-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        measurement_group_id: measurementGroupId,
        measured_at: new Date(measuredAtValue).toISOString(),
        field: currentField(),
      }),
    });
    const data = await response.json() as { message?: unknown; errors?: unknown };
    if (!response.ok) {
      const details = Array.isArray(data.errors)
        ? ` ${data.errors.slice(0, 2).join(" / ")}`
        : "";
      throw new Error(`${String(data.message ?? `HTTP ${response.status}`)}${details}`);
    }
    showStatus(String(data.message ?? "データベースへ保存しました。"), "success");
  } catch (error) {
    showStatus(`保存できませんでした: ${safeErrorMessage(error)}`, "error");
  } finally {
    saveDatabaseButton.disabled = !databaseConfigured || state.points.length === 0;
  }
}

function downloadText(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function safeFilename(name: string): string {
  const safe = name.trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-");
  return safe.slice(0, 80) || "anemo-wind-field";
}

function showStatus(message: string, kind: StatusKind): void {
  statusElement.textContent = message;
  statusElement.className = `status status-${kind}`;
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "不明なエラー";
}
