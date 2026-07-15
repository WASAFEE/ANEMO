import assert from "node:assert/strict";
import test from "node:test";
import {
  componentsFromPolar,
  createWindField,
  distanceMeters,
  interpolateWind,
  pointFromPolar,
  pointFromScreenDrag,
  polarFromComponents,
  validateWindField,
  windFieldToCsv,
} from "../public/wind-field";

const closeTo = (actual: number, expected: number, tolerance = 1e-9): void => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} is not within ${tolerance} of ${expected}`,
  );
};

test("北向き0度をNED成分へ変換できる", () => {
  const vector = componentsFromPolar(5, 0);
  closeTo(vector.north_mps, 5);
  closeTo(vector.east_mps, 0);
});

test("東向き90度をNED成分へ変換できる", () => {
  const vector = componentsFromPolar(5, 90);
  closeTo(vector.north_mps, 0);
  closeTo(vector.east_mps, 5);
  closeTo(polarFromComponents(vector).direction_to_deg, 90);
});

test("画面上向きドラッグを北向きの風として扱う", () => {
  const point = pointFromScreenDrag("p1", 35, 135, 0, -24, 12, 30);
  closeTo(point.speed_mps, 2);
  closeTo(point.direction_to_deg, 0);
});

test("上限を超えるドラッグは最大風速に丸める", () => {
  const point = pointFromScreenDrag("p1", 35, 135, 1200, 0, 12, 30);
  closeTo(point.speed_mps, 30);
});

test("制御点上の補間値は制御点の値と一致する", () => {
  const point = pointFromPolar("p1", 35, 135, 7, 225);
  const vector = interpolateWind([point], 35, 135);
  closeTo(vector.north_mps, point.north_mps);
  closeTo(vector.east_mps, point.east_mps);
});

test("等距離の反対向きベクトルは中央で相殺する", () => {
  const west = pointFromPolar("west", 35, 134.99, 4, 90);
  const east = pointFromPolar("east", 35, 135.01, 4, 270);
  const vector = interpolateWind([west, east], 35, 135);
  closeTo(vector.north_mps, 0, 1e-8);
  closeTo(vector.east_mps, 0, 1e-8);
});

test("日付変更線をまたぐ2点の距離を短い側で計算する", () => {
  const distance = distanceMeters(0, 179.9, 0, -179.9);
  assert.ok(distance > 20_000 && distance < 25_000);
});

test("正しい風場JSONを検証して正規化できる", () => {
  const field = createWindField(
    "test",
    [pointFromPolar("p1", 35, 135, 3, 45)],
    2,
    new Date("2026-07-15T00:00:00Z"),
  );
  const result = validateWindField(JSON.parse(JSON.stringify(field)));
  assert.equal(result.ok, true);
  assert.equal(result.field?.control_points.length, 1);
});

test("範囲外座標と重複IDを拒否する", () => {
  const field = createWindField("invalid", [
    pointFromPolar("same", 91, 135, 3, 45),
    pointFromPolar("same", 35, 135, 3, 45),
  ]);
  const result = validateWindField(field);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("latitude_deg")));
  assert.ok(result.errors.some((error) => error.includes("重複")));
});

test("異なる単位系と不正な日時を拒否する", () => {
  const field = createWindField("invalid units", [
    pointFromPolar("p1", 35, 135, 3, 45),
  ]) as unknown as Record<string, unknown>;
  field.units = { position: "degree", altitude: "m", wind_speed: "km/h" };
  field.created_at = "not-a-date";
  const result = validateWindField(field);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("units")));
  assert.ok(result.errors.some((error) => error.includes("created_at")));
});

test("CSVは単位を含む安定した列名で出力する", () => {
  const field = createWindField(
    "csv",
    [pointFromPolar("p1", 35, 135, 3, 180)],
  );
  const csv = windFieldToCsv(field);
  assert.match(csv, /^id,latitude_deg,longitude_deg,altitude_m,north_mps/);
  assert.match(csv, /p1,35,135,0/);
});
