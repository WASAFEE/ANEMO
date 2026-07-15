export const WIND_FIELD_SCHEMA = "wasafee.anemo.wind-field";
export const WIND_FIELD_VERSION = 1;
export const MAX_CONTROL_POINTS = 1000;

export interface WindVector {
  north_mps: number;
  east_mps: number;
  down_mps: number;
}

export interface WindControlPoint extends WindVector {
  id: string;
  latitude_deg: number;
  longitude_deg: number;
  altitude_m: number;
  speed_mps: number;
  direction_to_deg: number;
}

export interface WindField {
  schema: typeof WIND_FIELD_SCHEMA;
  version: typeof WIND_FIELD_VERSION;
  name: string;
  created_at: string;
  updated_at: string;
  coordinate_system: "WGS84";
  vector_frame: "NED";
  direction_convention: "flow_to_clockwise_from_true_north";
  units: {
    position: "degree";
    altitude: "m";
    wind_speed: "m/s";
  };
  interpolation: {
    method: "inverse_distance_weighting";
    power: number;
  };
  control_points: WindControlPoint[];
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  field?: WindField;
}

const DEG_TO_RAD = Math.PI / 180;
const EARTH_RADIUS_M = 6_371_008.8;

export function normalizeDirection(directionDeg: number): number {
  return ((directionDeg % 360) + 360) % 360;
}

export function componentsFromPolar(
  speedMps: number,
  directionToDeg: number,
  downMps = 0,
): WindVector {
  const speed = Math.max(0, speedMps);
  const radians = normalizeDirection(directionToDeg) * DEG_TO_RAD;
  return {
    north_mps: speed * Math.cos(radians),
    east_mps: speed * Math.sin(radians),
    down_mps: downMps,
  };
}

export function polarFromComponents(vector: WindVector): {
  speed_mps: number;
  direction_to_deg: number;
} {
  const speed = Math.hypot(
    vector.north_mps,
    vector.east_mps,
    vector.down_mps,
  );
  const horizontalSpeed = Math.hypot(vector.north_mps, vector.east_mps);
  const direction = horizontalSpeed < 1e-12
    ? 0
    : normalizeDirection(
        Math.atan2(vector.east_mps, vector.north_mps) / DEG_TO_RAD,
      );

  return { speed_mps: speed, direction_to_deg: direction };
}

export function pointFromPolar(
  id: string,
  latitudeDeg: number,
  longitudeDeg: number,
  speedMps: number,
  directionToDeg: number,
  altitudeM = 0,
  downMps = 0,
): WindControlPoint {
  const vector = componentsFromPolar(speedMps, directionToDeg, downMps);
  const polar = polarFromComponents(vector);
  return {
    id,
    latitude_deg: latitudeDeg,
    longitude_deg: longitudeDeg,
    altitude_m: altitudeM,
    ...vector,
    ...polar,
  };
}

export function pointFromScreenDrag(
  id: string,
  latitudeDeg: number,
  longitudeDeg: number,
  deltaXPx: number,
  deltaYPx: number,
  pixelsPerMps: number,
  maxSpeedMps: number,
): WindControlPoint {
  if (!Number.isFinite(pixelsPerMps) || pixelsPerMps <= 0) {
    throw new Error("pixelsPerMps must be greater than zero");
  }

  const unclampedNorth = -deltaYPx / pixelsPerMps;
  const unclampedEast = deltaXPx / pixelsPerMps;
  const unclampedSpeed = Math.hypot(unclampedNorth, unclampedEast);
  const scale = unclampedSpeed > maxSpeedMps
    ? maxSpeedMps / unclampedSpeed
    : 1;

  const vector: WindVector = {
    north_mps: unclampedNorth * scale,
    east_mps: unclampedEast * scale,
    down_mps: 0,
  };
  const polar = polarFromComponents(vector);

  return {
    id,
    latitude_deg: latitudeDeg,
    longitude_deg: longitudeDeg,
    altitude_m: 0,
    ...vector,
    ...polar,
  };
}

export function distanceMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const latA = latitudeA * DEG_TO_RAD;
  const latB = latitudeB * DEG_TO_RAD;
  const deltaLat = (latitudeB - latitudeA) * DEG_TO_RAD;
  const deltaLongitudeDeg = ((longitudeB - longitudeA + 540) % 360) - 180;
  const deltaLon = deltaLongitudeDeg * DEG_TO_RAD;
  const x = deltaLon * Math.cos((latA + latB) / 2);
  return EARTH_RADIUS_M * Math.hypot(x, deltaLat);
}

export function interpolateWind(
  controlPoints: readonly WindControlPoint[],
  latitudeDeg: number,
  longitudeDeg: number,
  power = 2,
): WindVector {
  if (controlPoints.length === 0) {
    return { north_mps: 0, east_mps: 0, down_mps: 0 };
  }

  const safePower = Math.min(4, Math.max(1, power));
  let sumWeights = 0;
  let north = 0;
  let east = 0;
  let down = 0;

  for (const point of controlPoints) {
    const distance = distanceMeters(
      latitudeDeg,
      longitudeDeg,
      point.latitude_deg,
      point.longitude_deg,
    );

    if (distance < 0.01) {
      return {
        north_mps: point.north_mps,
        east_mps: point.east_mps,
        down_mps: point.down_mps,
      };
    }

    const weight = 1 / Math.pow(distance, safePower);
    sumWeights += weight;
    north += point.north_mps * weight;
    east += point.east_mps * weight;
    down += point.down_mps * weight;
  }

  return {
    north_mps: north / sumWeights,
    east_mps: east / sumWeights,
    down_mps: down / sumWeights,
  };
}

export function createWindField(
  name: string,
  controlPoints: readonly WindControlPoint[],
  power = 2,
  now = new Date(),
): WindField {
  const timestamp = now.toISOString();
  return {
    schema: WIND_FIELD_SCHEMA,
    version: WIND_FIELD_VERSION,
    name: name.trim() || "名称未設定の風場",
    created_at: timestamp,
    updated_at: timestamp,
    coordinate_system: "WGS84",
    vector_frame: "NED",
    direction_convention: "flow_to_clockwise_from_true_north",
    units: {
      position: "degree",
      altitude: "m",
      wind_speed: "m/s",
    },
    interpolation: {
      method: "inverse_distance_weighting",
      power: Math.min(4, Math.max(1, power)),
    },
    control_points: controlPoints.map((point) => ({ ...point })),
  };
}

export function updateWindField(
  field: WindField,
  name: string,
  controlPoints: readonly WindControlPoint[],
  power: number,
  now = new Date(),
): WindField {
  return {
    ...field,
    name: name.trim() || "名称未設定の風場",
    updated_at: now.toISOString(),
    interpolation: {
      method: "inverse_distance_weighting",
      power: Math.min(4, Math.max(1, power)),
    },
    control_points: controlPoints.map((point) => ({ ...point })),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function readPoint(
  value: unknown,
  index: number,
  ids: Set<string>,
  errors: string[],
): WindControlPoint | null {
  const errorCountBeforePoint = errors.length;
  if (!isRecord(value)) {
    errors.push(`control_points[${index}] はオブジェクトである必要があります。`);
    return null;
  }

  const id = value.id;
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
    errors.push(`control_points[${index}].id の形式が不正です。`);
  } else if (ids.has(id)) {
    errors.push(`control_points[${index}].id が重複しています。`);
  } else {
    ids.add(id);
  }

  const numericKeys = [
    "latitude_deg",
    "longitude_deg",
    "altitude_m",
    "north_mps",
    "east_mps",
    "down_mps",
  ] as const;
  for (const key of numericKeys) {
    if (!finiteNumber(value[key])) {
      errors.push(`control_points[${index}].${key} は有限の数値である必要があります。`);
    }
  }

  if (finiteNumber(value.latitude_deg)
      && (value.latitude_deg < -90 || value.latitude_deg > 90)) {
    errors.push(`control_points[${index}].latitude_deg は -90〜90 の範囲です。`);
  }
  if (finiteNumber(value.longitude_deg)
      && (value.longitude_deg < -180 || value.longitude_deg > 180)) {
    errors.push(`control_points[${index}].longitude_deg は -180〜180 の範囲です。`);
  }
  if (finiteNumber(value.altitude_m)
      && (value.altitude_m < -1000 || value.altitude_m > 100000)) {
    errors.push(`control_points[${index}].altitude_m は -1000〜100000 m の範囲です。`);
  }

  if (errors.length > errorCountBeforePoint || typeof id !== "string") {
    return null;
  }

  const vector: WindVector = {
    north_mps: value.north_mps as number,
    east_mps: value.east_mps as number,
    down_mps: value.down_mps as number,
  };
  const polar = polarFromComponents(vector);
  if (polar.speed_mps > 100) {
    errors.push(`control_points[${index}] の風速は 100 m/s 以下にしてください。`);
    return null;
  }

  return {
    id,
    latitude_deg: value.latitude_deg as number,
    longitude_deg: value.longitude_deg as number,
    altitude_m: value.altitude_m as number,
    ...vector,
    ...polar,
  };
}

export function validateWindField(value: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) {
    return { ok: false, errors: ["JSONのルートはオブジェクトである必要があります。"] };
  }

  if (value.schema !== WIND_FIELD_SCHEMA) {
    errors.push(`schema は ${WIND_FIELD_SCHEMA} である必要があります。`);
  }
  if (value.version !== WIND_FIELD_VERSION) {
    errors.push(`対応している version は ${WIND_FIELD_VERSION} です。`);
  }
  if (typeof value.name !== "string" || value.name.trim().length === 0
      || value.name.length > 100) {
    errors.push("name は1〜100文字で指定してください。");
  }
  if (value.coordinate_system !== "WGS84") {
    errors.push("coordinate_system は WGS84 である必要があります。");
  }
  if (value.vector_frame !== "NED") {
    errors.push("vector_frame は NED である必要があります。");
  }
  if (value.direction_convention !== "flow_to_clockwise_from_true_north") {
    errors.push("direction_convention が対応形式ではありません。");
  }
  const units = value.units;
  if (!isRecord(units)
      || units.position !== "degree"
      || units.altitude !== "m"
      || units.wind_speed !== "m/s") {
    errors.push("units は position=degree、altitude=m、wind_speed=m/s である必要があります。");
  }
  if (typeof value.created_at !== "string"
      || !Number.isFinite(Date.parse(value.created_at))) {
    errors.push("created_at はISO 8601形式の日時である必要があります。");
  }
  if (typeof value.updated_at !== "string"
      || !Number.isFinite(Date.parse(value.updated_at))) {
    errors.push("updated_at はISO 8601形式の日時である必要があります。");
  }

  const interpolation = value.interpolation;
  let power = 2;
  if (!isRecord(interpolation)
      || interpolation.method !== "inverse_distance_weighting"
      || !finiteNumber(interpolation.power)
      || interpolation.power < 1
      || interpolation.power > 4) {
    errors.push("interpolation は IDW、power は1〜4で指定してください。");
  } else {
    power = interpolation.power;
  }

  if (!Array.isArray(value.control_points)) {
    errors.push("control_points は配列である必要があります。");
    return { ok: false, errors };
  }
  if (value.control_points.length > MAX_CONTROL_POINTS) {
    errors.push(`control_points は最大 ${MAX_CONTROL_POINTS} 点です。`);
    return { ok: false, errors };
  }

  const pointErrors: string[] = [];
  const ids = new Set<string>();
  const points = value.control_points
    .map((point, index) => readPoint(point, index, ids, pointErrors))
    .filter((point): point is WindControlPoint => point !== null);
  errors.push(...pointErrors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const createdAt = value.created_at as string;
  const updatedAt = value.updated_at as string;

  return {
    ok: true,
    errors: [],
    field: {
      schema: WIND_FIELD_SCHEMA,
      version: WIND_FIELD_VERSION,
      name: (value.name as string).trim(),
      created_at: createdAt,
      updated_at: updatedAt,
      coordinate_system: "WGS84",
      vector_frame: "NED",
      direction_convention: "flow_to_clockwise_from_true_north",
      units: {
        position: "degree",
        altitude: "m",
        wind_speed: "m/s",
      },
      interpolation: {
        method: "inverse_distance_weighting",
        power,
      },
      control_points: points,
    },
  };
}

export function windFieldToCsv(field: WindField): string {
  const header = [
    "id",
    "latitude_deg",
    "longitude_deg",
    "altitude_m",
    "north_mps",
    "east_mps",
    "down_mps",
    "speed_mps",
    "direction_to_deg",
  ];
  const rows = field.control_points.map((point) => [
    point.id,
    point.latitude_deg,
    point.longitude_deg,
    point.altitude_m,
    point.north_mps,
    point.east_mps,
    point.down_mps,
    point.speed_mps,
    point.direction_to_deg,
  ].join(","));
  return `${header.join(",")}\n${rows.join("\n")}\n`;
}
