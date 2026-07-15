# 保存した風データをHTML地図へ表示する

PostgreSQLの `weather.wind` を読み、Foliumで `wind_map.html` を生成します。

## 前提

1. [データベース](../docs/database.md)のセットアップとマイグレーションが完了している。
2. エディターまたはテストデータから `weather.wind` に1件以上保存されている。
3. [`uv`](https://docs.astral.sh/uv/getting-started/installation/)が利用できる。

## セットアップ

```bash
cd wind_analysis
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

## 実行

```bash
python wind_map.py
```

同じディレクトリに `wind_map.html` が生成されます。ブラウザで開いて確認します。

- 赤い丸: 保存地点
- 青い線: 保存された向きと風速

![風向・風速マップの表示例](../assets/wind_map.png)

## 単位と制約

- 緯度・経度: WGS84 degree
- 風速: m/s
- 新規ANEMOデータの `wind_direction`: 真北0°、時計回りの吹いていく向き

旧版データは向きの定義が不明な可能性があります。実測・設計用途では元データの定義を確認してください。DBが空の場合は地図中心を計算できないため、先にデータを保存します。

DB設定、生成HTML、資格情報はGitへコミットしないでください。
