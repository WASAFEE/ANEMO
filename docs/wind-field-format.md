# 風場データ形式

ANEMO JSON version 1は、静的な風場の制御点、単位、座標系、補間方法を1ファイルへ保存します。

## 基本仕様

| 項目 | 定義 |
| --- | --- |
| `schema` | `wasafee.anemo.wind-field` |
| `version` | `1` |
| 位置 | WGS84緯度・経度 `[degree]` |
| 高度 | `[m]` |
| ベクトル座標 | NED（North, East, Down） |
| 風速 | `[m/s]` |
| 方位角 | 真北0°、東90°、時計回り |
| 向き | 風が吹いていく向き（flow-to） |
| 補間 | NED成分ごとの逆距離加重（IDW） |

## JSON例

```json
{
  "schema": "wasafee.anemo.wind-field",
  "version": 1,
  "name": "example",
  "created_at": "2026-07-15T00:00:00.000Z",
  "updated_at": "2026-07-15T00:00:00.000Z",
  "coordinate_system": "WGS84",
  "vector_frame": "NED",
  "direction_convention": "flow_to_clockwise_from_true_north",
  "units": {
    "position": "degree",
    "altitude": "m",
    "wind_speed": "m/s"
  },
  "interpolation": {
    "method": "inverse_distance_weighting",
    "power": 2
  },
  "control_points": [
    {
      "id": "p1",
      "latitude_deg": 35.681236,
      "longitude_deg": 139.767125,
      "altitude_m": 0,
      "north_mps": 0,
      "east_mps": 5,
      "down_mps": 0,
      "speed_mps": 5,
      "direction_to_deg": 90
    }
  ]
}
```

JSON読込み時はNED成分を基準とし、`speed_mps` と `direction_to_deg` を再計算します。これにより、派生値と成分が食い違うファイルをそのまま利用しません。

## 方位角とNED成分

水平風速を \(V_h\)、吹いていく向きを \(\theta\) とします。\(\theta\) は度からラジアンへ変換して計算します。

\[
V_N = V_h \cos\theta
\]

\[
V_E = V_h \sin\theta
\]

全風速はDown成分を含めて次のように保存します。

\[
V = \sqrt{V_N^2 + V_E^2 + V_D^2}
\]

エディターで新規作成する風は \(V_D=0\) です。画面上の上向きドラッグは北向き、右向きドラッグは東向きです。

気象分野の風向が「風が来る向き」で与えられている場合、水平風の吹いていく向きは次で変換できます。

\[
\theta_{to} = (\theta_{from} + 180) \bmod 360
\]

## IDW補間

位置 \(x\) におけるNED各成分 \(v(x)\) は、制御点 \(i\) の値 \(v_i\) と地表近似距離 \(d_i\) から計算します。

\[
w_i = \frac{1}{d_i^p}
\]

\[
v(x) = \frac{\sum_i w_i v_i}{\sum_i w_i}
\]

`power` は1〜4です。制御点から1 cm未満の位置では、その制御点の値を直接返します。距離はWGS84緯度・経度に局所正距円筒近似を適用してメートルへ変換します。

この補間は入力ベクトル間を連続につなぎます。質量保存、地形境界層、乱流、時間変化などの物理条件は課していません。

## CSV

CSVは次の固定列を持ちます。

```text
id,latitude_deg,longitude_deg,altitude_m,north_mps,east_mps,down_mps,speed_mps,direction_to_deg
```

CSVにはスキーマ版、向きの定義、補間方法、作成日時が入りません。機械連携と編集保存にはJSONを推奨します。

## 入力制限

| 項目 | 制限 |
| --- | --- |
| ファイルサイズ | ブラウザ読込みは1 MB以下 |
| 制御点数 | 1000点以下 |
| `id` | 英数字、`_`、`-` の1〜64文字、重複不可 |
| 緯度 | -90〜90° |
| 経度 | -180〜180° |
| 高度 | -1000〜100000 m |
| 全風速 | JSON読込みは100 m/s以下 |
| 画面ドラッグの水平風速 | 30 m/s以下 |
| IDW power | 1〜4 |

## FlightEnvironmentEmulatorへ渡すとき

FlightEnvironmentEmulatorでは `north_mps`、`east_mps`、`down_mps` をNED風ベクトルとして読み取ります。次の処理はFlightEnvironmentEmulator側へ実装する必要があります。

1. JSONのスキーマ・版・単位を検査する。
2. 現在位置のWGS84緯度・経度・高度を取得する。
3. ANEMOと同じ規則で空間補間する。
4. NED風を対気速度計算へ反映する。
5. 入力ファイルのハッシュ、補間方法、NED風をログへ保存する。
6. 読込み失敗時の停止または無風へのフォールバックを明示する。

旧データの `wind_direction` は向きの定義が不明な可能性があります。移行時は元データの作成方法を確認し、`direction_to_deg` とNED成分へ変換してください。
