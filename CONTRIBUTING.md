# ANEMOへの貢献

ANEMOへの不具合報告、説明改善、試験追加、実装提案を歓迎します。公開リポジトリのため、最初に[公開開発・データ方針](docs/public-development-policy.md)を確認してください。

## 提案・不具合報告

[GitHub Issues](https://github.com/WASAFEE/ANEMO/issues)を使用し、次を記載します。

- 目的、利用者、背景
- 再現手順、期待した動作、実際の動作
- 対象範囲と完了条件
- 単位、座標系、符号、許容範囲
- OS、ソフトウェア版、対象コミット
- 外部データやコードの出典と利用条件

脆弱性や秘密情報の露出は公開Issueへ投稿せず、[`SECURITY.md`](SECURITY.md)を使用してください。

## Pull Request

1. Issueを作成または選択する。
2. `develop` から目的別ブランチを作る。
3. 実装、試験、利用者向け説明を更新する。
4. 公開できない情報が差分と履歴にないか確認する。
5. Draft PRを作成する。
6. CIと手動確認を完了し、Ready for reviewへ切り替える。

詳細は[開発の進め方](docs/development.md)を参照してください。

## 必須確認

`wind_generator` を変更した場合:

```bash
cd wind_generator
npm install
npm run check
npm test
npm run build
```

Pythonを変更した場合:

```bash
python -m compileall -q wind_analysis batch_gpv_wind
```

数値・座標・風向を変更した場合は、既知値、境界値、符号、単位変換の試験を追加してください。

## コードとデータの権利

Pull Requestを作成する人は、投稿内容を提供する権限があることを確認してください。外部コード、画像、データを含める場合は、作者・提供者、公式URL、ライセンス、加工内容、再配布可否をPRへ記録します。

WASA内部限定の資料や非公開FlightEnvironmentEmulatorの内容をこのリポジトリへ移さないでください。
