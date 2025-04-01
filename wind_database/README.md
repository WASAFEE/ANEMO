# 風向・風速データのテーブル設計と使い方

## 環境構築

### Docker と flyway を利用した DB 環境の構築

このプロジェクトでは、Docker Compose を使用して PostgreSQL のデータベース環境を構築します。  
データベースのマイグレーションは flyway を使用して管理します。

#### ローカル DB 環境構築

##### ローカル DB サーバーの立ち上げ

```bash
$ docker compose -f docker-compose-db.yml build
$ docker compose -f docker-compose-db.yml up -d
```

##### ローカル DB サーバーの停止

```bash
$ docker compose -f docker-compose-db.yml down
```

#### マイグレーションの実行

```bash
$ make flyway_migrate_all
```

DB の一部にのみマイグレーションを実行したい場合は、他のコマンドを使用してください。
コマンド一覧は Makefile 内に記載されています。

> **Note**
> データを migrate しなおす場合、DB の実態である db/data ファイルを削除してください。

## Docker Save / Load

### Docker Saving

preparation

```bash
$ docker compose build
$ docker images
```

Docker image save

```bash
$ docker save windanalysis_db_migration -o windanalysis_db_migration.`date "+%Y%m%d_%H%M%S"`.tar
$ file windanalysis_db_migration.YYYYmmdd_HMS.tar
```

Delete current docker image

```bash
$ docker rmi windanalysis_db_migration
```

### Docker Loading

```bash
$ docker load -i windanalysis_db_migration.YYYYmmdd_HMS.tar
$ docker images
```

## ルール

### file 命名規則

- prefix
  - "V" で Versioned Migration 、"U" で Undo Migration 、 "R" で Repeat Migration を示します。
- version
  - バージョン番号は一意になるように設定します。 "."(ピリオド) で区切る文字列で定義します。 通常は整数で定義するようです。
- separator
  - "\_\_"(アンダースコア 2 つ) 固定です。
- description
  - 該当バージョンの修正概要を記載します。 文字は " "(空白) または "\_"(アンダースコア) で結合します。
- suffix
  - ".sql" 固定です。

### create schema

```
make flyway_migrate_core
```

### insert test data

```
make flyway_migrate_testdata_all
```

## データ取得例

DBeaver などで localhost:5432 に接続してください。

- データベース名: windanalysisdb
- ユーザー名: postgres
- パスワード: example

### データ取得クエリ

- 特定グループ（`measurement_group_id = 1`）のデータ取得

```sql
SELECT *
FROM wind
WHERE measurement_group_id = 1;
```

- 最新の測定グループのデータ取得

```sql
SELECT *
FROM wind
WHERE measurement_group_id = (
    SELECT measurement_group_id
    FROM wind
    ORDER BY measured_at DESC
    LIMIT 1
);
```
