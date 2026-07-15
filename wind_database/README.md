# 風データ用PostgreSQL

Docker ComposeでローカルPostgreSQLを起動し、Flywayで `weather.wind` を管理します。初めて使う場合は、全体手順の[データベース](../docs/database.md)を参照してください。

## 最短手順

```bash
docker compose -f docker-compose-db.yml build
docker compose -f docker-compose-db.yml up -d
make flyway_migrate_all
```

停止:

```bash
docker compose -f docker-compose-db.yml down
```

## 主なMakeターゲット

```bash
make help
make flyway_migrate_all
make flyway_migrate_testdata_all
make flyway_info_windanalysisdb
make flyway_repair_windanalysisdb
```

適用済みマイグレーションSQLを変更するとFlywayのチェックサムが一致しなくなります。変更は新しい版番号のファイルとして追加してください。

## ローカル接続

- host: `127.0.0.1`
- port: `5433`
- database: `windanalysisdb`
- application user: `wasa_user`

サンプル資格情報はローカルDocker専用です。DBポートは `127.0.0.1` にだけバインドします。共有・本番環境では固有の強い資格情報、最小権限、ネットワーク分離、TLSを設定してください。

## マイグレーション命名

```text
V<version>__<description>.sql
```

- `V`: Versioned Migration
- version: 一意な番号
- 区切り: アンダースコア2個
- description: 変更内容
- suffix: `.sql`

## データ確認例

```sql
SELECT *
FROM weather.wind
WHERE measurement_group_id = 1
ORDER BY measured_at, id;
```

既存データの `wind_direction` は旧版で定義が明示されていない可能性があります。新規ANEMO APIは真北0°、時計回りの吹いていく向きを保存します。
