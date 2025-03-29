# 風向・風速データのテーブル設計と使い方

## 環境構築

### Docker を利用した DB 環境の構築

このプロジェクトでは、Docker Compose を使用して MySQL のデータベース環境を構築します。  
これにより、プロジェクトメンバー全員が同一の DB 環境を簡単に利用できるようになります。

#### 構成概要

- **MySQL コンテナ**

  - 指定した MySQL バージョンで DB を構築
  - 必要な環境変数（例：`MYSQL_ROOT_PASSWORD`、`MYSQL_DATABASE`、`MYSQL_USER`、`MYSQL_PASSWORD`）を設定
  - 初期化 SQL ファイルをマウントし、コンテナ起動時に自動で実行（例：`wind` テーブルの作成など）

- **(オプション) Adminer コンテナ**
  - データベースの状態をブラウザで確認するための Web ベースの管理ツール
  - http://localhost:8080 でアクセス可能

#### セットアップ手順

1. **環境変数の設定**  
   `.env` ファイル内で設定されている環境変数を、実際の環境に合わせて変更してください。

2. **コンテナの起動**  
   プロジェクトルートディレクトリで以下のコマンドを実行し、コンテナを起動します。

   ```bash
   docker compose up -d
   ```

3. **コンテナの停止**  
   コンテナを停止する場合は以下のコマンドを実行します。

   ```bash
   docker compose down
   ```

## テーブル設計(以下は実行不要)

```sql
CREATE TABLE wind (
    id INT AUTO_INCREMENT PRIMARY KEY,
    measurement_group_id INT NOT NULL,  -- 同時刻の測定グループを識別するためのID
    measured_at DATETIME NOT NULL,
    wind_direction FLOAT NOT NULL,      -- 風向（0〜360度）
    wind_speed FLOAT NOT NULL,          -- 風速（m/s）
    latitude DOUBLE NOT NULL,           -- 緯度
    longitude DOUBLE NOT NULL,          -- 経度
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX(measurement_group_id)
);
```

## データ挿入例

```sql
INSERT INTO wind (measurement_group_id, measured_at, wind_direction, wind_speed, latitude, longitude)
VALUES
(1, '2025-03-25 09:30:00', 90.0, 3.5, 35.681236, 139.767125),
(1, '2025-03-25 09:30:00', 95.0, 4.2, 35.689500, 139.691700),
(1, '2025-03-25 09:30:00', 85.0, 3.8, 35.658034, 139.701636);
```

## データ取得例

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
