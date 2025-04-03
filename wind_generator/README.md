# ビルドと実行手順

## 依存ライブラリのインストール

プロジェクトルートで以下のコマンドを実行して必要なパッケージをインストールします。

```bash
npm install
```

## サーバー側のコンパイルと実行

以下のコマンドでサーバー側の TypeScript をコンパイルし、起動します。

```bash
npx tsc server.ts
node dist/server.js
```

## クライアント側のビルド

クライアント側の TypeScript（public/script.ts）もコンパイルし、public/script.js として出力してください。

```bash
npx tsc public/scripts.ts --outDir public
```

## 動作確認

ブラウザで http://localhost:3000/ にアクセスすると、Leaflet マップが表示されます。マップ上でクリック＆ドラッグすると、軌跡から計算された風向・風速のデータが画面上に表示され、同時にサーバーへ送信され SQL テーブルに保存されます。
