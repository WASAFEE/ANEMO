# SQL に保存した風向・風速データを Folium でマップ表示（Polars 使用版）

このドキュメントでは、SQL に保存した風向・風速のデータを Python の**Polars**と**Folium**を使って地図上に矢印表示する方法を紹介します。

## ① 必要なライブラリのインストール

```bash
pip install folium polars pymysql
```

## ② Python による地図表示コード（Polars 使用）

### サンプルコード

```python
import folium
import pymysql
import polars as pl
import math

# DB接続設定（環境に合わせて変更してください）
conn = pymysql.connect(
    host='localhost',
    user='your_username',
    password='your_password',
    database='your_database',
    charset='utf8mb4'
)

# SQLからデータを読み込む（measurement_group_id = 1の場合）
query = "SELECT latitude, longitude, wind_direction, wind_speed FROM wind_measurements WHERE measurement_group_id = 1;"
with conn.cursor() as cursor:
    cursor.execute(query)
    result = cursor.fetchall()

conn.close()

# PolarsのDataFrameに変換
df = pl.DataFrame(result, schema=['latitude', 'longitude', 'wind_direction', 'wind_speed'])

# 地図の中心を設定
map_center = [df['latitude'].mean(), df['longitude'].mean()]

# Folium地図作成
m = folium.Map(location=map_center, zoom_start=14)

# 矢印を地図上に描画する関数
def add_wind_arrow(map_obj, lat, lon, direction_deg, speed):
    # 表示用スケール（必要に応じて調整）
    length_scale = 0.001
    rad = math.radians(direction_deg - 90)
    end_lat = lat + speed * length_scale * math.sin(rad)
    end_lon = lon + speed * length_scale * math.cos(rad)

    # 風向矢印を地図に追加
    folium.PolyLine(
        locations=[(lat, lon), (end_lat, end_lon)],
        color="blue",
        weight=3,
        opacity=0.8,
        tooltip=f'風向: {direction_deg}°, 風速: {speed} m/s'
    ).add_to(map_obj)

    # 測定点マーカーを追加
    folium.CircleMarker(
        location=(lat, lon),
        radius=3,
        color='red',
        fill=True,
        fill_opacity=0.8
    ).add_to(map_obj)

# 各測定データを地図に表示
for row in df.iter_rows(named=True):
    add_wind_arrow(m, row['latitude'], row['longitude'], row['wind_direction'], row['wind_speed'])

# 地図をHTML形式で保存
m.save('wind_map.html')
```

## ③ 表示結果

コードを実行すると`wind_map.html`というファイルが生成されます。このファイルをブラウザで開くと、次のようなマップが表示されます。

- **赤い丸**が測定した地点
- **青色の矢印（線）**が風の吹く方向と強さを示しています（矢印が長いほど風が強いことを示します）。

## 備考

- 実際のデータベース接続情報はご自身の環境に合わせて修正してください。
- 表示スケールや矢印のデザインなどは自由に調整可能です。
