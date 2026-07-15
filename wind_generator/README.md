# 風場エディター

地図上へ複数の風ベクトルを置き、場所によって連続的に変化する風場を作成するWebアプリです。DB未設定でもJSON・CSV入出力と自動保存を利用できます。

初めて使う場合は、リポジトリ全体の[はじめてのセットアップ](../docs/getting-started.md)を参照してください。

## 起動

```bash
npm install
npm start
```

ブラウザで <http://localhost:3000> を開きます。終了は `Ctrl+C` です。

## 開発用コマンド

```bash
npm run check
npm test
npm run build
npm run start:built
```

| コマンド | 内容 |
| --- | --- |
| `npm run check` | サーバー、クライアント、試験のTypeScript型検査 |
| `npm test` | 風ベクトル変換、IDW補間、JSON検証の単体試験 |
| `npm run build` | `dist` を作り直してサーバーとクライアントをコンパイル |
| `npm start` | ビルド後にローカルサーバーを起動 |
| `npm run start:built` | 既存のビルド結果で起動 |

## データベース（任意）

```bash
cp environment/local.example.json environment/local.json
```

先にPostgreSQLとFlywayマイグレーションを準備します。手順は[データベース](../docs/database.md)にあります。

設定の優先順位:

1. `DATABASE_URL`
2. `ANEMO_CONFIG` が指すJSON
3. `environment/local.json`

DBへ接続できない場合もサーバーは起動し、ファイル機能を維持します。

## 環境変数

| 変数 | 既定値 | 用途 |
| --- | --- | --- |
| `ANEMO_HOST` | `127.0.0.1` | Webサーバーの待受けアドレス |
| `ANEMO_PORT` | `3000` | Webサーバーのポート |
| `ANEMO_CONFIG` | `environment/local.json` | DB設定JSONのパス |
| `DATABASE_URL` | なし | PostgreSQL接続URL。JSONより優先 |
| `PGSSLMODE` | なし | `require` でTLS検証を要求 |

既定構成はローカル利用向けです。認証を実装していないため、`ANEMO_HOST=0.0.0.0` を設定して外部公開する前に[公開開発・データ方針](../docs/public-development-policy.md#公開サービスとして配信するとき)を確認してください。

## 主要ファイル

| ファイル | 役割 |
| --- | --- |
| `server.ts` | 静的配信、ヘルスチェック、PostgreSQL保存API |
| `public/index.html` | 画面構造 |
| `public/styles.css` | レスポンシブ表示と配色 |
| `public/scripts.ts` | 地図操作、状態管理、描画、ファイル・API操作 |
| `public/wind-field.ts` | 単位変換、NEDベクトル、IDW、JSON検証、CSV |
| `tests/wind-field.test.ts` | 数値処理と入力検証の単体試験 |

データ形式は[風場データ形式](../docs/wind-field-format.md)、全体構成は[仕組みとデータの流れ](../docs/architecture.md)を参照してください。
