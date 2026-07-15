# データベース

PostgreSQL保存は任意機能です。風場エディターのJSON・CSV機能はデータベースなしで利用できます。

## 必要なソフト

- Docker DesktopまたはDocker Engine
- Docker Compose v2（`docker compose` コマンド）
- `make`（マイグレーションの短縮コマンドを使う場合）

## 1. ローカルDBを起動する

リポジトリ直下から実行します。

```bash
cd wind_database
docker compose -f docker-compose-db.yml build
docker compose -f docker-compose-db.yml up -d
```

DBは `127.0.0.1:5433` で待ち受けます。LANへは公開しません。

状態を確認します。

```bash
docker compose -f docker-compose-db.yml ps
docker compose -f docker-compose-db.yml logs
```

## 2. マイグレーションを実行する

`make` が使える場合:

```bash
make flyway_migrate_all
```

テストデータも入れる場合:

```bash
make flyway_migrate_testdata_all
```

Flywayの履歴を確認します。

```bash
make flyway_info_windanalysisdb
```

適用済みのマイグレーションファイルは書き換えないでください。変更は新しい版番号のSQLとして追加します。

## 3. エディター用のローカル設定を作る

```bash
cd ../wind_generator
cp environment/local.example.json environment/local.json
```

Windows PowerShellでは次を使えます。

```powershell
Copy-Item environment/local.example.json environment/local.json
```

サンプル設定は、このリポジトリのローカルDocker DB専用です。共有DBや本番DBでは固有の資格情報を安全な方法で設定してください。`environment/local.json` は `.gitignore` に登録されています。

`DATABASE_URL` を使う場合は、JSON設定より優先されます。

```bash
export DATABASE_URL='postgresql://USER:PASSWORD@HOST:PORT/DATABASE'
npm start
```

環境変数をターミナル履歴、Issue、Pull Request、スクリーンショットへ残さないでください。

## 4. 接続を確認する

```bash
npm start
```

<http://localhost:3000> を開き、「データベースへ保存（任意）」に「データベースへ接続できました」と表示されることを確認します。

## 5. 風場を保存する

1. 風を1点以上作る。
2. 「データベースへ保存（任意）」を開く。
3. 測定グループIDと日時を確認する。
4. 「データベースへ保存」を押す。
5. 保存件数が表示されることを確認する。

制御点は `weather.wind` へ保存されます。現行テーブルは風場名と補間設定を保持しないため、正式記録としてANEMO JSONも保存してください。

## 6. DBを停止する

```bash
cd ../wind_database
docker compose -f docker-compose-db.yml down
```

データを保持したまま停止します。`wind_database/db/data` を削除するとローカルDBの実体が失われます。

## 設定の優先順位

1. `DATABASE_URL`
2. `ANEMO_CONFIG` が指すJSON
3. `wind_generator/environment/local.json`
4. 未設定としてファイル機能のみ起動

Webポートは `ANEMO_PORT`、待受けアドレスは `ANEMO_HOST` で変更できます。既定値は `3000` と `127.0.0.1` です。

## バックアップと復旧

正式運用では、PostgreSQLの版に合う `pg_dump` / `pg_restore` を使用し、次を記録してください。

- バックアップ日時
- 対象DBとスキーマ
- GitコミットまたはRelease
- Flywayの適用状況
- 復元試験の結果
- 保存場所とアクセス権

Dockerのデータディレクトリを直接コピーする方法は、停止状態やPostgreSQL版への依存が大きいため、正式バックアップでは復元試験済みの手順を使用してください。
