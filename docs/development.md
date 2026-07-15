# 開発の進め方

ANEMOは公開リポジトリで、Issue、作業ブランチ、Pull Request、レビューを使って開発します。標準開発ブランチは `develop` です。

## 基本フロー

1. Issueで目的、背景、範囲、完了条件を合意する。
2. `develop` を更新し、Issueごとのブランチを作る。
3. 小さな単位で実装し、試験と説明書を同じ変更へ含める。
4. 早い段階でDraft PRを作り、設計や途中状態を共有する。
5. 自動検査を通し、自分で差分と公開情報を確認する。
6. 実装と説明が完成したらReady for reviewへ切り替える。
7. レビュー指摘へ対応し、承認後にマージする。

## Issueに書く内容

- 目的と利用者
- 現在の動作と困りごと
- 対象範囲、対象外
- 単位、座標系、符号、許容範囲
- 通信断、異常値、停止、元へ戻す方法
- 完了条件と試験条件
- 旧版との互換性または移行手順
- 外部コード、データ、画像の出典と利用条件

公開Issueへ内部資料、非公開FEEコード、秘密情報、個人情報を添付しないでください。

## ブランチを作る

```bash
git switch develop
git pull --ff-only
git switch -c feature/issue-123-short-description
```

例:

- `feature/issue-68-wind-field-editor`
- `fix/issue-81-import-validation`
- `docs/issue-90-getting-started`

1つのブランチには1つの目的を持たせます。無関係な整形や生成物を混ぜません。

## Draft PRとReady for review

### Draft PR

設計相談、途中実装、早期の自動検査に使います。未完了項目、確認してほしい点、既知の制約をPR本文へ明記します。Draftの間はマージ対象にしません。

### Ready for review

完了条件を満たし、利用者向け説明、移行手順、試験結果、公開情報確認が揃った状態です。レビュー担当者が最終判断できる粒度にします。

## ローカル検査

`wind_generator` を変更した場合:

```bash
cd wind_generator
npm install
npm run check
npm test
npm run build
npm start
```

最低限、次を手動確認します。

- 新規風の追加、選択、数値編集、削除
- 元に戻す、やり直す、全消去の復元
- JSON書出しと再読込み
- 不正JSONの拒否
- DB未設定でも起動する
- 画面幅を狭くして操作できる
- ブラウザコンソールに未処理エラーがない

Pythonを変更した場合:

```bash
python -m compileall -q wind_analysis batch_gpv_wind
```

実データやDBが必要な試験は、対象データの出典、日時、設定、結果をPRへ記録します。

## CI

GitHub ActionsはPull Requestと `develop` へのpushで次を実行します。

- TypeScript型検査
- 風ベクトル変換・補間・JSON検証の単体試験
- Webエディターのビルド
- Pythonソースの構文コンパイル

CI成功は実機安全性や数値モデルの妥当性を示しません。手動の受入試験と専門レビューを併用します。

## コミットとPR本文

コミットメッセージは変更の目的が分かる短い文にします。

```text
feat: add continuous wind-field editor
docs: add first-time setup guide
fix: reject invalid wind vectors
```

PR本文には次を含めます。

- 変更内容
- 変更理由
- 利用者への影響
- 単位・座標・互換性
- 実行した検査と結果
- 未実装範囲と後続Issue
- `Closes #123` または関連Issue

## データベース変更

- 適用済みFlyway SQLを編集しない。
- 一意な新しい版番号でマイグレーションを追加する。
- 既存データの移行とロールバック方針を書く。
- 破壊的変更はバックアップと復元試験を先に行う。
- サンプル資格情報がローカル専用であることを明記する。

## 依存関係と外部要素

Pythonコンポーネントの仮想環境と依存パッケージは `uv` のプロジェクト機能で管理します。対象コンポーネント内で次を実行します。

```bash
uv sync
uv run python -m compileall -q .
```

`uv sync` が `pyproject.toml` と `uv.lock` から `.venv` を作成・同期します。コマンドは `uv run` で実行するため、OSごとのactivate操作は不要です。`.venv` はローカル専用で、Gitへコミットしません。

新しいPython依存は `uv add <package>` で追加し、`pyproject.toml` と `uv.lock` を同じコミットで更新します。公式配布元、保守状況、ライセンス、ブラウザ送信先、再配布物を確認し、不要な依存を増やしません。Pythonコードへimportを追加した場合は、クリーンな `uv` 環境でimport確認も行います。

画像、地図、気象データを追加するときは、出典、作者・提供者、利用条件、加工内容、再配布可否を同じPRへ記録します。

## レビュー観点

- 入力範囲、単位、座標系、符号が明確か
- 失敗時に既存データを壊さないか
- SQL、HTML、ファイル読込みの入力検証があるか
- 秘密情報と内部資料が含まれていないか
- WASA独自部分と第三者要素の由来が区別されているか
- 初めての利用者が説明書だけで再現できるか
- 自動試験が重要な変換と回帰を覆っているか
