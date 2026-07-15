# MSM GRIB2から地点風データを抽出する

気象庁MSMのGRIB2を外部アーカイブから取得し、指定地点の予報時刻、風向、風速を抽出してPostgreSQLへ保存する実験コンポーネントです。

> [!WARNING]
> 現在の `main.py` は対象日時、地点、測定グループIDをコード内で指定します。自動定期実行や正式データ処理へ使用する前に、引数化、重複防止、取得元の障害処理、出典記録、試験を追加してください。

## 前提

- [`uv`](https://docs.astral.sh/uv/getting-started/installation/)
- Python 3.12（未導入の場合も `uv` で取得できます）
- `pygrib` が必要とするネイティブライブラリ
- 起動・マイグレーション済みのANEMO PostgreSQL
- 外部アーカイブへ接続できるネットワーク

## セットアップ

```bash
cd batch_gpv_wind
uv venv --python 3.12
```

macOS / Linux:

```bash
source .venv/bin/activate
```

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

依存パッケージを `requirements.txt` と同じ状態に揃え、ローカル設定を作ります。`uv` はカレントディレクトリの `.venv` を自動検出します。

```bash
uv pip sync requirements.txt
cp environment/local.example.json environment/local.json
```

Windows PowerShellのコピー:

```powershell
Copy-Item environment/local.example.json environment/local.json
```

## 対象を設定する

`main.py` の次を確認してから実行します。

- `land_lat`, `land_lon`: WGS84緯度・経度
- `year`, `month`, `day`, `time`: 取得対象日時
- `measurement_group_id`: DB内で識別する整数

対象日時のタイムゾーンとGRIB2の予報時間を記録してください。

## 実行

```bash
python main.py
```

`ModuleNotFoundError` が出た場合は、同じディレクトリで `uv pip sync requirements.txt` を再実行し、`python -c "import psycopg2"` が成功することを確認してください。

ダウンロードした `*.bin` は `msm` に保存され、Git管理対象外です。標準出力のデータフレームとDB保存完了メッセージを確認します。

## データの出典と利用条件

コードは京都大学生存圏研究所の気象データアーカイブURLを使用し、元データは気象庁MSMです。利用・公表時は、取得元アーカイブと[気象庁ホームページの利用規約](https://www.jma.go.jp/jma/kishou/info/coment.html)を確認し、提供者、URL、取得日時、対象時刻、加工内容、ANEMOの版を記録してください。

取得したGRIB2をこの公開リポジトリへコミットしないでください。
