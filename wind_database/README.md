# 風向・風速データのテーブル設計と使い方

## 環境構築

### Docker と flyway を利用した DB 環境の構築

このプロジェクトでは、Docker Compose を使用して PostgreSQL のデータベース環境を構築します。  
データベースのマイグレーションは flyway を使用して管理します。

#### ローカル DB 環境構築

##### ローカル DB サーバーの立ち上げ

```bash
$ docker compose -f docker-compose.yml build
$ docker compose -f docker-compose.yml up -d
```

##### ローカル DB サーバーの停止

```bash
$ docker compose -f docker-compose.yml down
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
