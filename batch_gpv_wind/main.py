import os
import subprocess
from module.met_phiys_module import MetPhysModule
import pandas as pd
# import numpy as np
import psycopg2
from datetime import datetime

# データベース接続情報
DB_CONFIG = {
    'dbname': 'windanalysisdb',
    'user': 'wasa_user',
    'password': 'wasafee',
    'host': 'localhost',
    'port': '5433'
}

# 東京駅の緯度経度を設定する
land_lat = 35.681236
land_lon = 139.767125

# ダウンロードする日付を指定する
year = "2024"
month = "02"
day = "05"
time = "0000"
# 2024/02/05 00:00(UTC 09:00)の地上データをダウンロードする
cwd = f"{os.getcwd()}/msm"
url_surf = f'http://database.rish.kyoto-u.ac.jp/arch/jmadata/data/gpv/original/{year}/{month}/{day}/Z__C_RJTD_{year}{month}{day}{time}00_MSM_GPV_Rjp_Lsurf_FH00-15_grib2.bin'
print(f"ダウンロードURL: {url_surf}")

# ファイルが存在する場合は削除
file_surf = os.path.join(cwd, os.path.basename(url_surf))
if os.path.exists(file_surf):
    os.remove(file_surf)

# ファイルをダウンロード
result = subprocess.run(['curl', '-O', url_surf], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, cwd=cwd)
if result.returncode != 0:
    print("ファイルのダウンロードに失敗しました")
    exit(1)

print(f"ダウンロードしたファイル: {file_surf}")
print(f"ファイルサイズ: {os.path.getsize(file_surf)} bytes")

## GRIB2ファイルを読み込む
# MetPhysModuleクラスをインスタンス化する
calcwind = MetPhysModule(land_lat, land_lon, file_surf)

# calcWindDataメソッドを実行して、予報時刻、風向および風速のリスト変数を取得する
vt, wdir, wspd = calcwind.calcWindData()

# 予報時刻、風向および風速のリスト変数をPandasのデータフレームに入力する
df = pd.DataFrame({"ValidTime":vt, "WindDirection":wdir, "WindSpeed":wspd})

print(df)

# データベースに接続してデータを挿入
try:
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    # 測定グループIDを生成（現在のタイムスタンプを使用）
    measurement_group_id = "0"
    
    # データを挿入
    for _, row in df.iterrows():
        cur.execute("""
            INSERT INTO weather.wind 
            (measurement_group_id, measured_at, wind_direction, wind_speed, latitude, longitude)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            measurement_group_id,
            row['ValidTime'],
            row['WindDirection'],
            row['WindSpeed'],
            land_lat,
            land_lon
        ))
    
    conn.commit()
    print(f"データベースへの挿入が完了しました。測定グループID: {measurement_group_id}")
    
except Exception as e:
    print(f"データベース操作中にエラーが発生しました: {str(e)}")
    conn.rollback()
    
finally:
    if 'cur' in locals():
        cur.close()
    if 'conn' in locals():
        conn.close()