# ドキュメント案内所

初めて使う人は、[はじめてのセットアップ](getting-started.md)から進めてください。

## 利用者向け

| ページ | 内容 |
| --- | --- |
| [はじめてのセットアップ](getting-started.md) | 必要なソフト、導入、初回起動、最初の風場作成 |
| [基本操作](basic-operation.md) | 風の追加・編集、補間、保存、読込み、復旧 |
| [機能一覧](features.md) | 実装済み機能、実験機能、未実装範囲 |
| [風場データ形式](wind-field-format.md) | JSON、CSV、単位、座標系、補間式 |
| [データベース](database.md) | Docker、PostgreSQL、Flyway、API保存 |
| [トラブルシューティング](troubleshooting.md) | 症状別の確認手順 |

## 開発者・管理者向け

| ページ | 内容 |
| --- | --- |
| [仕組みとデータの流れ](architecture.md) | コンポーネント、API、失敗時の動作 |
| [開発の進め方](development.md) | Issue、ブランチ、Draft PR、レビュー、CI |
| [公開開発・データ方針](public-development-policy.md) | 公開可能な情報、秘密情報、第三者データ |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md) | 外部・内部の貢献手順 |
| [`SECURITY.md`](../SECURITY.md) | 脆弱性の報告方法 |
| [`NOTICE.md`](../NOTICE.md) | WASAでの由来と第三者要素 |

## コンポーネント固有

- [`wind_generator`](../wind_generator/README.md)
- [`wind_database`](../wind_database/README.md)
- [`wind_analysis`](../wind_analysis/README.md)
- [`batch_gpv_wind`](../batch_gpv_wind/README.md)
