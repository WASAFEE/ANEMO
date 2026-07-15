# MSM GRIB2から地点風データを抽出する

気象庁MSMのGRIB2を外部アーカイブから取得し、指定地点の予報時刻、風向、風速を抽出してPostgreSQLへ保存する実験コンポーネントです。

> [!WARNING]
> 現在の `main.py` は対象日時、地点、測定グループIDをコード内で指定します。自動定期実行や正式データ処理へ使用する前に、引数化、重複防止、取得元の障害処理、出典記録、試験を追加してください。

## 前提

- [`uv`](https://docs.astral.sh/uv/getting-started/installation/)
- `pygrib` が必要とするネイティブライブラリ
- 起動・マイグレーション済みのANEMO PostgreSQL
- 外部アーカイブへ接続できるネットワーク

## セットアップ

```bash
cd batch_gpv_wind
uv sync
```

`uv sync` はPython 3.12と `.venv` を必要に応じて用意し、`pyproject.toml` と `uv.lock` に従って依存パッケージを同期します。activate操作は不要です。

ローカル設定を作ります。

```bash
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
uv run main.py
```

`ModuleNotFoundError` が出た場合は、同じディレクトリで `uv sync` を再実行し、`uv run python -c "import psycopg2"` が成功することを確認してください。

### TLS証明書のエラーが出る場合

取得元サーバーの証明書チェーンに問題があると、`curl: (60) SSL certificate problem` と表示されます。これは依存パッケージの問題ではなく、安全なHTTPS接続を検証できないためにダウンロードを停止した状態です。

まず、表示されたURLが京都大学生存圏研究所のものか確認してください。取得元を信頼でき、証明書の問題が解消するまで一時的に処理を続ける必要がある場合に限り、次を使用できます。

```bash
uv run main.py --allow-insecure-download
```

このオプションはTLS証明書の検証を無効化します。常用せず、配布サーバーの証明書が復旧したら通常の `uv run main.py` に戻してください。ダウンロード後も、プログラムはファイル先頭がGRIB形式であることを確認します。

ダウンロードした `*.bin` は `msm` に保存され、Git管理対象外です。標準出力のデータフレームとDB保存完了メッセージを確認します。

## データの出典と利用条件

コードは京都大学生存圏研究所の気象データアーカイブURLを使用し、元データは気象庁MSMです。利用・公表時は、取得元アーカイブと[気象庁ホームページの利用規約](https://www.jma.go.jp/jma/kishou/info/coment.html)を確認し、提供者、URL、取得日時、対象時刻、加工内容、ANEMOの版を記録してください。

取得したGRIB2をこの公開リポジトリへコミットしないでください。
