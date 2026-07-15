import folium
import polars as pl
import math
import psycopg2
import json

DISPLAY_SECONDS = 60.0
METERS_PER_DEGREE_LATITUDE = 111_320.0
# DB接続設定
with open('./environment/local.json') as f:
    config = json.load(f)
conn = psycopg2.connect(
    host=config['postgres']['host'],
    user=config['postgres']['user'], 
    password=config['postgres']['password'],
    database=config['postgres']['dbname'],
    port=config['postgres']['port']
)

# SQLからデータを読み込む
query = "SELECT latitude, longitude, wind_direction, wind_speed FROM weather.wind;"
with conn.cursor() as cursor:
    cursor.execute(query)
result = cursor.fetchall()

conn.close()

if not result:
    raise SystemExit("weather.wind に表示できるデータがありません。先に風データを保存してください。")

# PolarsのDataFrameに変換
df = pl.DataFrame(result, schema=['latitude', 'longitude', 'wind_direction', 'wind_speed'])

# 地図の中心を設定
map_center = [df['latitude'].mean(), df['longitude'].mean()]

# Folium地図作成
m = folium.Map(location=map_center, zoom_start=14)

# 矢印を地図上に描画する関数
def add_wind_arrow(map_obj, lat, lon, direction_deg, speed):
    # direction_deg は真北0°、時計回りの「吹いていく向き」。
    # 60秒間に移動する距離を地図表示用の矢印長へ変換する。
    rad = math.radians(direction_deg)
    north_mps = speed * math.cos(rad)
    east_mps = speed * math.sin(rad)
    end_lat = lat + north_mps * DISPLAY_SECONDS / METERS_PER_DEGREE_LATITUDE
    longitude_scale = METERS_PER_DEGREE_LATITUDE * max(math.cos(math.radians(lat)), 1e-6)
    end_lon = lon + east_mps * DISPLAY_SECONDS / longitude_scale

    # 風向矢印を地図に追加
    folium.PolyLine(
        locations=[(lat, lon), (end_lat, end_lon)],
        color="blue",
        weight=3,
        opacity=0.8,
        tooltip=f'吹いていく向き: {direction_deg}°, 風速: {speed} m/s'
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

# 凡例を追加するためのHTMLを作成
legend_html = '''
<div style="
    position: fixed; 
    bottom: 50px; left: 50px; width: 150px; height: 90px; 
    background-color: white; z-index:9999; font-size:14px;
    border:2px solid grey; border-radius:5px;
    ">
    <h4 style="margin:10px;">凡例</h4>
    <p style="margin:10px;"> 
        <i style="background:blue; width:10px; height:10px; float:left; margin-right:5px;"></i> 風向矢印<br>
        <i style="background:red; width:10px; height:10px; float:left; margin-right:5px;"></i> 測定点
    </p>
</div>
'''

# 地図に凡例を追加
m.get_root().html.add_child(folium.Element(legend_html))

# 地図をHTML形式で保存
m.save('wind_map.html')
