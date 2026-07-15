import argparse
import json
import sys
from pathlib import Path

import pandas as pd
import psycopg2

from module.download import DownloadError, download_grib2
from module.met_phiys_module import MetPhysModule


BASE_DIRECTORY = Path(__file__).resolve().parent


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="MSM GRIB2から指定地点の風を抽出し、PostgreSQLへ保存します。"
    )
    parser.add_argument(
        "--allow-insecure-download",
        action="store_true",
        help=(
            "配布サーバーのTLS証明書を検証せずに取得します。"
            "信頼できるURLだと確認した場合の一時回避に限って使用してください。"
        ),
    )
    return parser.parse_args(argv)


def load_db_config() -> dict[str, object]:
    config_path = BASE_DIRECTORY / "environment" / "local.json"
    with config_path.open(encoding="utf-8") as config_file:
        env_config = json.load(config_file)

    postgres = env_config["postgres"]
    return {
        "dbname": postgres["dbname"],
        "user": postgres["user"],
        "password": postgres["password"],
        "host": postgres["host"],
        "port": postgres["port"],
    }


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    db_config = load_db_config()

    # 東京駅の緯度経度を設定する
    land_lat = 35.681236
    land_lon = 139.767125

    # ダウンロードする日付を指定する
    year = "2024"
    month = "02"
    day = "05"
    time = "0000"
    # 2024/02/05 00:00(UTC 09:00)の地上データをダウンロードする
    url_surf = (
        "https://database.rish.kyoto-u.ac.jp/arch/jmadata/data/gpv/original/"
        f"{year}/{month}/{day}/"
        f"Z__C_RJTD_{year}{month}{day}{time}00_MSM_GPV_Rjp_Lsurf_FH00-15_grib2.bin"
    )
    file_surf = BASE_DIRECTORY / "msm" / Path(url_surf).name
    print(f"ダウンロードURL: {url_surf}")

    if args.allow_insecure_download:
        print(
            "警告: TLS証明書の検証を無効化してダウンロードします。",
            file=sys.stderr,
        )

    try:
        download_grib2(
            url_surf,
            file_surf,
            allow_insecure=args.allow_insecure_download,
        )
    except DownloadError as error:
        print(error, file=sys.stderr)
        return 1

    print(f"ダウンロードしたファイル: {file_surf}")
    print(f"ファイルサイズ: {file_surf.stat().st_size} bytes")

    # GRIB2ファイルを読み込む
    calcwind = MetPhysModule(land_lat, land_lon, str(file_surf))
    vt, wdir, wspd = calcwind.calcWindData()
    df = pd.DataFrame(
        {"ValidTime": vt, "WindDirection": wdir, "WindSpeed": wspd}
    )
    print(df)

    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**db_config)
        cur = conn.cursor()

        measurement_group_id = 1
        for _, row in df.iterrows():
            cur.execute(
                """
                INSERT INTO weather.wind
                (measurement_group_id, measured_at, wind_direction, wind_speed, latitude, longitude)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    measurement_group_id,
                    row["ValidTime"],
                    row["WindDirection"],
                    row["WindSpeed"],
                    land_lat,
                    land_lon,
                ),
            )

        conn.commit()
        print(
            "データベースへの挿入が完了しました。"
            f"測定グループID: {measurement_group_id}"
        )
    except Exception as error:
        print(f"データベース操作中にエラーが発生しました: {error}")
        if conn is not None:
            conn.rollback()
        return 1
    finally:
        if cur is not None:
            cur.close()
        if conn is not None:
            conn.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
