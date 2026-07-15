import express = require("express");
import fs = require("node:fs");
import path = require("node:path");
import { Pool, PoolConfig } from "pg";
import {
  WindControlPoint,
  validateWindField,
} from "./public/wind-field";

interface JsonDatabaseConfig {
  postgres?: {
    host?: unknown;
    user?: unknown;
    password?: unknown;
    dbname?: unknown;
    port?: unknown;
  };
}

const app = express();
const port = parsePort(process.env.ANEMO_PORT, 3000);
const host = process.env.ANEMO_HOST?.trim() || "127.0.0.1";
const sourcePublicDirectory = path.resolve(__dirname, "../../public");
const generatedPublicDirectory = path.resolve(__dirname, "../public");
const leafletDirectory = path.resolve(__dirname, "../../node_modules/leaflet/dist");
const databaseConfig = loadDatabaseConfig();
const pool = databaseConfig ? new Pool(databaseConfig) : null;

app.disable("x-powered-by");
app.use((_request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.tile.openstreetmap.org",
      "connect-src 'self' https://*.tile.openstreetmap.org",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
    ].join("; "),
  );
  next();
});
app.use(express.json({ limit: "1mb", strict: true }));
app.use("/assets", express.static(generatedPublicDirectory, {
  dotfiles: "deny",
  fallthrough: false,
  index: false,
}));
app.use("/vendor", express.static(leafletDirectory, {
  dotfiles: "deny",
  fallthrough: false,
  index: false,
}));
app.use(express.static(sourcePublicDirectory, {
  dotfiles: "deny",
  extensions: ["html"],
  index: "index.html",
}));

app.get("/api/health", async (_request, response) => {
  let database = "not_configured";
  if (pool) {
    try {
      await pool.query("SELECT 1");
      database = "ready";
    } catch (error) {
      database = "unreachable";
      console.warn("Database health check failed:", safeErrorMessage(error));
    }
  }
  response.json({ status: "ok", database, wind_field_schema_version: 1 });
});

app.post("/api/wind-fields", async (request, response) => {
  if (!pool) {
    response.status(503).json({
      message: "データベースは未設定です。JSONまたはCSVの書き出しは利用できます。",
      code: "DATABASE_NOT_CONFIGURED",
    });
    return;
  }

  const body = isRecord(request.body) ? request.body : {};
  const measurementGroupId = body.measurement_group_id;
  const measuredAt = body.measured_at;
  const validation = validateWindField(body.field);

  const errors: string[] = [];
  if (!Number.isInteger(measurementGroupId)
      || (measurementGroupId as number) < 1
      || (measurementGroupId as number) > 2_147_483_647) {
    errors.push("measurement_group_id は1〜2147483647の整数で指定してください。");
  }
  if (typeof measuredAt !== "string" || !Number.isFinite(Date.parse(measuredAt))) {
    errors.push("measured_at はISO 8601形式の日時で指定してください。");
  }
  errors.push(...validation.errors);
  if (validation.field && validation.field.control_points.length === 0) {
    errors.push("保存する制御点がありません。");
  }

  if (errors.length > 0 || !validation.field) {
    response.status(400).json({ message: "入力値を確認してください。", errors });
    return;
  }

  let client: import("pg").PoolClient | null = null;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    for (const point of validation.field.control_points) {
      await insertWindPoint(
        client,
        measurementGroupId as number,
        measuredAt as string,
        point,
      );
    }
    await client.query("COMMIT");
    response.status(201).json({
      message: `${validation.field.control_points.length}点の風データを保存しました。`,
      saved_count: validation.field.control_points.length,
      measurement_group_id: measurementGroupId,
    });
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch(() => undefined);
    }
    console.error("Failed to save a wind field:", safeErrorMessage(error));
    response.status(500).json({
      message: "データベースへの保存に失敗しました。サーバーログを確認してください。",
      code: "DATABASE_WRITE_FAILED",
    });
  } finally {
    client?.release();
  }
});

// 旧版クライアント向け。direction は「北を0度とした時計回りの吹いていく向き」。
app.post("/api/save_wind_data", async (request, response) => {
  if (!pool) {
    response.status(503).json({
      message: "データベースは未設定です。",
      code: "DATABASE_NOT_CONFIGURED",
    });
    return;
  }

  const body = isRecord(request.body) ? request.body : {};
  const groupId = body.measurement_group_id;
  const measuredAt = body.measured_at;
  const direction = body.wind_direction;
  const speed = body.wind_speed;
  const latitude = body.latitude;
  const longitude = body.longitude;

  if (!Number.isInteger(groupId)
      || !finiteInRange(direction, 0, 360, false)
      || !finiteInRange(speed, 0, 100)
      || !finiteInRange(latitude, -90, 90)
      || !finiteInRange(longitude, -180, 180)
      || typeof measuredAt !== "string"
      || !Number.isFinite(Date.parse(measuredAt))) {
    response.status(400).json({ message: "入力値の単位と範囲を確認してください。" });
    return;
  }

  const point: WindControlPoint = {
    id: "legacy",
    latitude_deg: latitude as number,
    longitude_deg: longitude as number,
    altitude_m: 0,
    north_mps: (speed as number) * Math.cos((direction as number) * Math.PI / 180),
    east_mps: (speed as number) * Math.sin((direction as number) * Math.PI / 180),
    down_mps: 0,
    speed_mps: speed as number,
    direction_to_deg: direction as number,
  };

  let client: import("pg").PoolClient | null = null;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    await insertWindPoint(
      client,
      groupId as number,
      measuredAt,
      point,
    );
    await client.query("COMMIT");
    response.status(201).json({ message: "データを保存しました。" });
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch(() => undefined);
    }
    console.error("Failed to save legacy wind data:", safeErrorMessage(error));
    response.status(500).json({ message: "データ保存に失敗しました。" });
  } finally {
    client?.release();
  }
});

app.use((error: unknown, _request: express.Request, response: express.Response,
  _next: express.NextFunction) => {
  if (error instanceof SyntaxError) {
    response.status(400).json({ message: "JSONの形式が正しくありません。" });
    return;
  }
  console.error("Unhandled request error:", safeErrorMessage(error));
  response.status(500).json({ message: "サーバーで予期しないエラーが発生しました。" });
});

const server = app.listen(port, host, () => {
  console.log(`ANEMO wind editor: http://${host}:${port}`);
  console.log(`Database: ${pool ? "configured" : "not configured (file export remains available)"}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => {
      void pool?.end().finally(() => process.exit(0));
    });
  });
}

async function insertWindPoint(
  client: import("pg").PoolClient,
  measurementGroupId: number,
  measuredAt: string,
  point: WindControlPoint,
): Promise<void> {
  await client.query(
    `INSERT INTO weather.wind
      (measurement_group_id, measured_at, wind_direction, wind_speed, latitude, longitude)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      measurementGroupId,
      measuredAt,
      point.direction_to_deg,
      point.speed_mps,
      point.latitude_deg,
      point.longitude_deg,
    ],
  );
}

function loadDatabaseConfig(): PoolConfig | null {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 2_000,
      ssl: process.env.PGSSLMODE === "require"
        ? { rejectUnauthorized: true }
        : undefined,
    };
  }

  const defaultConfigPath = path.resolve(__dirname, "../../environment/local.json");
  const configPath = process.env.ANEMO_CONFIG
    ? path.resolve(process.env.ANEMO_CONFIG)
    : defaultConfigPath;
  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, "utf8")) as JsonDatabaseConfig;
    const postgres = parsed.postgres;
    if (!postgres
        || typeof postgres.host !== "string"
        || typeof postgres.user !== "string"
        || typeof postgres.password !== "string"
        || typeof postgres.dbname !== "string"
        || !finiteInRange(Number(postgres.port), 1, 65535)) {
      throw new Error("postgres settings are incomplete");
    }
    return {
      host: postgres.host,
      user: postgres.user,
      password: postgres.password,
      database: postgres.dbname,
      port: Number(postgres.port),
      connectionTimeoutMillis: 2_000,
    };
  } catch (error) {
    console.error(`Database config could not be loaded from ${configPath}:`, safeErrorMessage(error));
    return null;
  }
}

function parsePort(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535
    ? parsed
    : fallback;
}

function finiteInRange(
  value: unknown,
  minimum: number,
  maximum: number,
  includeMaximum = true,
): value is number {
  return typeof value === "number"
    && Number.isFinite(value)
    && value >= minimum
    && (includeMaximum ? value <= maximum : value < maximum);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message || error.name || "unknown error";
  }
  return "unknown error";
}
