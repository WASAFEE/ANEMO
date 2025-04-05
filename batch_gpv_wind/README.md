# GRIB2 データからの地点データ抽出

## GRIB2 データについて

GRIB2(General Regularly-distributed Information in Binary form version 2)は、気象データの標準フォーマットです。

主な特徴:

- 格子点データとして気象要素を保持
- データ圧縮により効率的なストレージ
- WMO によって標準化された形式

## 必要なツール

- wgrib2: GRIB2 ファイルの操作に特化したコマンドラインツール
- Python ライブラリ:
  - pygrib: Python で GRIB2 を扱うためのライブラリ
  - numpy: 数値計算ライブラリ
  - pandas: データ分析ライブラリ

## データ抽出の基本手順

1. 対象地点の緯度・経度を特定
2. GRIB2 ファイルから最近傍格子点のデータを抽出
3. 必要に応じて時系列データとして整形

# 環境構築

## 仮想環境の立ち上げと必要パッケージのインストール

```bash
$ cd gpv_wind
$ source .venv/bin/activate
$ pip install -r requirements.txt
```

## main.py の実行方法

1. 気象庁 MSM の GRIB2 ファイルを入手し、プロジェクトルートに配置します。
   ファイル名の例: `Z__C_RJTD_20240205000000_MSM_GPV_Rjp_Lsurf_FH00-15_grib2.bin`

2. 仮想環境が有効化されていることを確認し、以下のコマンドを実行します:

```bash
$ python main.py
```
