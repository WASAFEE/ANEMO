import pygrib
from datetime import timedelta
import math

class MetPhysModule :
        def __init__(self, reflat, reflon, grib2) :

                # 抽出する地点の緯度経度と抽出範囲を設定する
                self.req_lat1 = reflat - 0.025
                self.req_lat2 = reflat + 0.025
                self.req_lon1 = reflon - 0.03125
                self.req_lon2 = reflon + 0.03125

                # GRIB2ファイル名を設定する
                self.grib2dat = grib2

                # UTCから日本時間に変換するための時刻差を設定する
                self.diff_time = timedelta(hours=9)

        def calcWindData(self) :
                # GPVファイル名を指定してオープンする。
                print(f"GRIBファイルを開きます: {self.grib2dat}")
                gpv_file = pygrib.open(self.grib2dat)

                # 利用可能なメッセージを表示
                print("利用可能なメッセージ:")
                for msg in gpv_file:
                    print(f"  - {msg.name} ({msg.typeOfLevel})")

                # 地上風のコンポーネントベクトルを取り出す。
                u_comp = gpv_file.select(name="10 metre U wind component")
                v_comp = gpv_file.select(name="10 metre V wind component")

                print(f"U成分のメッセージ数: {len(u_comp)}")
                print(f"V成分のメッセージ数: {len(v_comp)}")

                if len(u_comp) == 0 or len(v_comp) == 0:
                    print("エラー: 風速データが見つかりません")
                    return [], [], []

                # 予想時刻と抽出した要素データを格納するリストを初期化する。
                valid_dates = []
                wind_dir    = []
                wind_spd    = []

                # 風向と風速をコンポーネントベクトルから計算する
                for uwind, vwind in zip(u_comp, v_comp) :
                        # 予想時刻をリストに抽出する
                        valid_dates.append(uwind.validDate + self.diff_time)

                        # データの抽出範囲を表示
                        print(f"データ抽出範囲: lat={self.req_lat1}-{self.req_lat2}, lon={self.req_lon1}-{self.req_lon2}")

                        try:
                            u_data = uwind.data(
                                    lat1 = self.req_lat1, lat2 = self.req_lat2,
                                    lon1 = self.req_lon1, lon2 = self.req_lon2
                                    )
                            v_data = vwind.data(
                                    lat1 = self.req_lat1, lat2 = self.req_lat2,
                                    lon1 = self.req_lon1, lon2 = self.req_lon2
                                    )

                            print(f"Uデータの形状: {u_data[0].shape}")
                            print(f"Vデータの形状: {v_data[0].shape}")

                            u_pt = u_data[0][0][0]
                            v_pt = v_data[0][0][0]

                            if v_pt == 0 and u_pt == 0 :
                                    wdir = 0.0
                                    wspd = 0.0
                            else :
                                    # Uは東向き、Vは北向き。ANEMOでは真北0°、
                                    # 時計回りの「吹いていく向き」を保存する。
                                    wdir = math.degrees(math.atan2(u_pt, v_pt))
                                    if wdir < 0 :
                                            wdir = wdir + 360.0
                                    wspd = math.sqrt(u_pt * u_pt + v_pt * v_pt)

                            wind_dir.append(wdir)
                            wind_spd.append(wspd)

                        except Exception as e:
                            print(f"データ抽出中にエラーが発生しました: {str(e)}")
                            continue

                return valid_dates, wind_dir, wind_spd
