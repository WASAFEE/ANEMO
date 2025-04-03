"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
// server.ts
var express = require("express");
var bodyParser = require("body-parser");
var pg_1 = require("pg");
var cors = require("cors");
var app = express();
var port = 3000;
// ミドルウェアの設定
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'));
// PostgreSQL 接続プールの設定
var pool = new pg_1.Pool({
    host: 'localhost',
    user: 'wasa_user',
    password: 'wasafee',
    database: 'windanalysisdb',
    port: 5433
});
// POST エンドポイント：風データを保存する
app.post('/api/save_wind_data', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var client, _a, measurement_group_id, measured_at, wind_direction, wind_speed, latitude, longitude, sql, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, pool.connect()];
            case 1:
                client = _b.sent();
                _b.label = 2;
            case 2:
                _b.trys.push([2, 6, 8, 9]);
                _a = req.body, measurement_group_id = _a.measurement_group_id, measured_at = _a.measured_at, wind_direction = _a.wind_direction, wind_speed = _a.wind_speed, latitude = _a.latitude, longitude = _a.longitude;
                // トランザクションの開始
                return [4 /*yield*/, client.query('BEGIN')];
            case 3:
                // トランザクションの開始
                _b.sent();
                sql = "\n      INSERT INTO weather.wind\n      (measurement_group_id, measured_at, wind_direction, wind_speed, latitude, longitude)\n      VALUES ($1, $2, $3, $4, $5, $6)\n    ";
                return [4 /*yield*/, client.query(sql, [
                        measurement_group_id,
                        measured_at,
                        wind_direction,
                        wind_speed,
                        latitude,
                        longitude
                    ])];
            case 4:
                _b.sent();
                // トランザクションのコミット
                return [4 /*yield*/, client.query('COMMIT')];
            case 5:
                // トランザクションのコミット
                _b.sent();
                // データ保存の代わりに成功メッセージを返す
                res.json({ message: 'データを正常に保存しました' });
                console.log("\u30C7\u30FC\u30BF\u3092\u6B63\u5E38\u306B\u4FDD\u5B58\u3057\u307E\u3057\u305F: ".concat(sql));
                return [3 /*break*/, 9];
            case 6:
                error_1 = _b.sent();
                // エラーが発生した場合はロールバック
                return [4 /*yield*/, client.query('ROLLBACK')];
            case 7:
                // エラーが発生した場合はロールバック
                _b.sent();
                console.error('Error saving wind data:', error_1);
                res.status(500).json({ message: 'データ保存に失敗しました', error: error_1 });
                return [3 /*break*/, 9];
            case 8:
                // クライアントを解放
                client.release();
                return [7 /*endfinally*/];
            case 9: return [2 /*return*/];
        }
    });
}); });
app.listen(port, function () {
    console.log("Server is running on port http://localhost:".concat(port));
});
