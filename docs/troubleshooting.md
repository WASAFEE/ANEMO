# トラブルシューティング

最初に、実行したディレクトリとエラー全文を確認してください。`wind_generator` のコマンドは `ANEMO/wind_generator` で実行します。

## `node` または `npm` が見つからない

```bash
node --version
npm --version
```

Node.js 20以上をインストールし、ターミナルを開き直します。複数版を管理している場合は、現在選択されている版を確認してください。

## `npm install` が失敗する

1. インターネット接続を確認する。
2. `wind_generator/package.json` があるディレクトリか確認する。
3. エラーの最初の原因行を確認する。
4. プロキシ環境では、組織の管理者が指定するnpm設定を使用する。

`package-lock.json` は再現性のためGit管理しています。理由なく削除しないでください。

## Pythonで `ModuleNotFoundError` が出る

`batch_gpv_wind` または `wind_analysis` の対象ディレクトリで、プロジェクト環境を同期してから `uv run` が使うPythonを確認します。

```bash
uv --version
uv sync
uv run python -c "import sys; print(sys.executable)"
```

`sys.executable` は対象ディレクトリの `.venv` を指します。activate操作は不要です。`uv lock --check` で `pyproject.toml` と `uv.lock` の整合も確認できます。

`batch_gpv_wind` のDBドライバーだけを確認する場合:

```bash
uv run python -c "import psycopg2; print(psycopg2.__version__)"
```

グローバル環境へ個別に追加せず、依存は `uv add` で `pyproject.toml` へ追加し、`uv.lock` と同期して再現可能な状態を維持します。

## MSMデータのダウンロードで証明書エラーが出る

`batch_gpv_wind` で次のようなエラーが表示される場合、取得元サーバーのTLS証明書チェーンを検証できていません。

```text
curl: (60) SSL certificate problem: unable to get local issuer certificate
```

表示されたURLが京都大学生存圏研究所のものか確認し、通常は配布サーバーの復旧後に再実行してください。取得元を信頼でき、処理を一時的に続ける必要がある場合だけ、次の明示的な回避オプションを使用できます。

```bash
uv run main.py --allow-insecure-download
```

これはTLS証明書の検証を無効化するため常用しないでください。プログラムは取得後にGRIB形式の署名を確認しますが、通信相手の真正性を保証するものではありません。

## 3000番ポートが使用中

別ポートで起動します。

macOS / Linux:

```bash
ANEMO_PORT=3001 npm start
```

Windows PowerShell:

```powershell
$env:ANEMO_PORT=3001
npm start
```

ブラウザで <http://localhost:3001> を開きます。

## ブラウザで接続できない

- `npm start` を実行したターミナルが終了していないか確認する。
- ターミナルに表示されたURLをそのまま開く。
- `https://` を付けず、`http://` で開く。
- OSやセキュリティソフトのローカル通信制限を確認する。

既定では `127.0.0.1` だけで待ち受けます。別PCからは接続できません。

## 背景地図が白い・灰色のまま

ANEMO本体が表示されていれば、地図タイルの取得に失敗している可能性があります。

- インターネット接続を確認する。
- ブラウザの開発者ツールで `tile.openstreetmap.org` のエラーを確認する。
- 組織ネットワークのフィルター、VPN、広告ブロッカーを確認する。
- 短時間に大量の再読込みを行わない。

地図タイルが表示されなくても、JSONの読込み・書き出しと表の確認は利用できます。大量利用や公開配信では、OpenStreetMap標準タイルの[Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/)に合う提供方法を選んでください。

## ドラッグしても風が追加されない

- 「風を追加」が選択されているか確認する。
- 始点から8 px以上ドラッグする。
- 地図の拡大縮小ボタン上から始めていないか確認する。
- ページを再読込みし、前回状態が復元されるか確認する。

地図を移動するときは「地図を移動」を選びます。

## 矢印の向きが想定と逆

画面の矢印は風が吹いていく向きです。気象情報の風向が風の来る向きなら、180°加えて0〜360°へ正規化します。詳しくは[風場データ形式](wind-field-format.md#方位角とned成分)を確認してください。

## JSONを読み込めない

- ファイルが1 MB以下か確認する。
- `schema` が `wasafee.anemo.wind-field` か確認する。
- `version` が `1` か確認する。
- 制御点IDの重複、緯度・経度、風速範囲を確認する。
- JSON末尾の余分なカンマやコメントを削除する。

不正ファイルを選んでも、現在の風場は維持されます。

## 前回の作業が復元されない

自動保存はブラウザのlocalStorageを使います。次の場合は失われる可能性があります。

- ブラウザのサイトデータを消去した
- シークレット／プライベートモードを終了した
- ブラウザやホスト名、ポートを変更した
- ストレージ利用が拒否された

正式保存にはANEMO JSONを使用してください。

## データベースが `not_configured`

ファイル機能だけを使う場合は正常です。DB保存を使う場合は[データベース](database.md)に従い、DBを起動して `environment/local.json` を作ります。

## データベースが `unreachable`

1. `docker compose -f wind_database/docker-compose-db.yml ps` で起動状態を確認する。
2. `127.0.0.1:5433` を別アプリが使用していないか確認する。
3. `environment/local.json` のhost、port、dbname、userを確認する。
4. Flywayマイグレーションの実行結果を確認する。
5. DBコンテナのログを確認する。

接続情報やログをIssueへ貼る前に、パスワード、ユーザー名、内部ホスト名を削除してください。

## `git pull` で更新できない

```bash
git status
git diff
```

自分の変更を確認し、作業ブランチへコミットするか、必要なファイルを安全な場所へ退避します。`git reset --hard` や強制上書きで未保存の変更を消さないでください。

## Issueへ報告するとき

次を添えてください。

- OSとバージョン
- Node.jsとnpmのバージョン
- ブラウザ名とバージョン
- 実行したコマンド
- 再現手順
- 期待した動作と実際の動作
- 秘密情報を除いたエラー全文
- 対象コミットまたはブランチ

脆弱性、秘密情報の露出、認証回避は公開Issueへ書かず、[`SECURITY.md`](../SECURITY.md)の方法で報告してください。
