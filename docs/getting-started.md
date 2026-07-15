# はじめてのセットアップ

このページでは、ANEMOを初めて触る人が、地図上に風を入力してJSONへ保存するところまで進めます。PostgreSQLやDockerは後から追加できます。

## 1. 必要なソフトを用意する

| ソフト | 用途 | 入手先 |
| --- | --- | --- |
| Git | リポジトリの取得と更新 | [Git公式](https://git-scm.com/downloads) |
| Node.js 20以上 | 風場エディターのビルドと起動 | [Node.js公式](https://nodejs.org/) |
| Webブラウザ | エディターの表示 | Edge、Chrome、Firefox、Safariなど |

ターミナルを開き、次のコマンドで導入を確認します。

```bash
git --version
node --version
npm --version
```

WindowsではPowerShell、macOSではターミナルを使用できます。`node` や `npm` が見つからない場合は、Node.jsをインストールしてからターミナルを開き直してください。

## 2. ANEMOを取得する

作業したいフォルダーで次を実行します。

```bash
git clone https://github.com/WASAFEE/ANEMO.git
cd ANEMO/wind_generator
```

すでに取得済みの場合は、保存していない変更がないことを確認してから更新します。

```bash
git status
git pull --ff-only
```

`git status` に自分の変更が表示された場合は、上書きせず、[トラブルシューティング](troubleshooting.md#git-pullで更新できない)を確認してください。

## 3. パッケージをインストールする

`wind_generator` ディレクトリで実行します。

```bash
npm install
```

初回はパッケージの取得に時間がかかります。`node_modules` は自動生成され、Gitには登録されません。

## 4. 起動する

```bash
npm start
```

ビルドと単体試験で使うTypeScriptがコンパイルされ、次のような案内が表示されます。

```text
ANEMO wind editor: http://localhost:3000
Database: not configured (file export remains available)
```

ブラウザで <http://localhost:3000> を開きます。データベース未設定の表示は正常です。JSONとCSVの書き出し、JSONの読込み、風場の作成は利用できます。

## 5. 最初の風場を作る

1. 左側で「風を追加」が選ばれていることを確認する。
2. 地図上の任意地点から、風が吹いていく向きへドラッグする。
3. 緑色の矢印が追加され、青色の補間矢印が地図全体に表示されることを確認する。
4. 別の地点にも2〜3本追加する。
5. 表または緑色の矢印を選び、水平風速、向き、高度を数値で調整する。
6. 「JSONを書き出す」を押す。

書き出した `*.anemo.json` が保存できれば、最初の動作確認は完了です。「例を読み込む」から説明用の合成データも確認できます。

> [!NOTE]
> 画面の矢印は風が吹いていく向きです。真北が0°、東が90°で、風速はm/sです。気象情報の「北風」は北から来る風を指すため、入力時は向きの定義を確認してください。

## 6. 終了する

起動に使ったターミナルを選び、`Ctrl+C` を押します。ブラウザのタブを閉じます。

作業内容はブラウザのローカルストレージへ自動保存され、同じブラウザで次回起動したときに復元されます。正式な保存や別PCへの移動にはJSONを書き出してください。ブラウザのデータ消去、シークレットモード、端末故障では自動保存が失われる可能性があります。

## 7. 次回の起動

```bash
cd ANEMO/wind_generator
npm start
```

パッケージ構成が変わった場合は、先に `npm install` を実行します。

## 8. 任意機能を追加する

- PostgreSQLへ保存する: [データベース](database.md)
- 保存データをHTML地図へ変換する: [`wind_analysis`](../wind_analysis/README.md)
- MSM GRIB2を取り込む: [`batch_gpv_wind`](../batch_gpv_wind/README.md)
- 開発に参加する: [開発の進め方](development.md)

## 9. 初回確認チェックリスト

- [ ] `npm install` が完了した
- [ ] <http://localhost:3000> が開いた
- [ ] 地図上に風を3点以上追加できた
- [ ] 青色の補間結果が表示された
- [ ] 選択した風を数値編集できた
- [ ] 「元に戻す」で直前の状態へ戻れた
- [ ] ANEMO JSONを書き出して再読込みできた
- [ ] 単位と向きの定義を確認した

うまくいかない場合は、[トラブルシューティング](troubleshooting.md)の症状別手順を確認してください。
