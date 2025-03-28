# 風向・風速データ入力インターフェース：画面なぞり入力

このサンプルでは、ユーザーが画面上でマウスまたはタッチ操作によりなぞった軌跡から、以下の情報を取得します。

- **風向**  
  軌跡の始点と終点から計算される角度（0 ～ 360°）
- **風速**  
  軌跡の長さ（ピクセル距離を風速の指標として利用）
- **描画速度によるカバレッジ係数**  
  画面上をなぞる速度が速いほど、大きな値（例：1 ～ 5 の間）を割り当て、より広範囲の風として登録可能にする

## サンプルコード（HTML/JavaScript）

以下のコードを `index.html` として保存し、ブラウザで開くことで動作を確認できます。

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>風向・風速データ入力インターフェース</title>
    <style>
      #canvas {
        border: 1px solid #ccc;
        touch-action: none; /* タッチ操作時の既定の動作を無効化 */
      }
      body {
        font-family: Arial, sans-serif;
      }
    </style>
  </head>
  <body>
    <h1>風向・風速データ入力</h1>
    <p>画面上をなぞって、風の向きと強さ（および広がり）を入力してください。</p>
    <canvas id="canvas" width="600" height="400"></canvas>
    <div id="result"></div>

    <script>
      const canvas = document.getElementById("canvas");
      const ctx = canvas.getContext("2d");
      let isDrawing = false;
      let startX, startY, startTime;
      let endX, endY, endTime;

      // マウス/タッチイベントの設定
      canvas.addEventListener("mousedown", startDrawing);
      canvas.addEventListener("touchstart", startDrawing);
      canvas.addEventListener("mousemove", draw);
      canvas.addEventListener("touchmove", draw);
      canvas.addEventListener("mouseup", finishDrawing);
      canvas.addEventListener("touchend", finishDrawing);

      // マウス/タッチ座標取得用ヘルパー
      function getTouchPos(e) {
        if (e.touches && e.touches.length > 0) {
          return {
            x: e.touches[0].clientX - canvas.getBoundingClientRect().left,
            y: e.touches[0].clientY - canvas.getBoundingClientRect().top,
          };
        }
        return {
          x: e.clientX - canvas.getBoundingClientRect().left,
          y: e.clientY - canvas.getBoundingClientRect().top,
        };
      }

      // 描画開始時の処理
      function startDrawing(e) {
        e.preventDefault();
        isDrawing = true;
        const pos = getTouchPos(e);
        startX = pos.x;
        startY = pos.y;
        startTime = new Date().getTime();
        ctx.clearRect(0, 0, canvas.width, canvas.height); // キャンバスのクリア
        ctx.beginPath();
        ctx.moveTo(startX, startY);
      }

      // 描画中の処理（軌跡を描く）
      function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const pos = getTouchPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }

      // 描画終了時の処理
      function finishDrawing(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const pos = getTouchPos(e);
        endX = pos.x;
        endY = pos.y;
        endTime = new Date().getTime();
        isDrawing = false;

        // 始点と終点からベクトル計算
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        // 風向の計算（atan2はラジアンで返すので、度に変換）
        const angleRadians = Math.atan2(dy, dx);
        let angleDegrees = angleRadians * (180 / Math.PI);
        if (angleDegrees < 0) angleDegrees += 360;

        // 描画速度の計算（ピクセル/ms）
        const timeDiff = endTime - startTime;
        const drawingSpeed = timeDiff > 0 ? distance / timeDiff : 0;

        // 描画速度に応じたカバレッジ係数（例：速いほど1～5の範囲で大きくなる）
        const coverageFactor = Math.min(1 + drawingSpeed * 10, 5);

        // 結果の表示
        const resultDiv = document.getElementById("result");
        resultDiv.innerHTML = `
        <p>風向: ${angleDegrees.toFixed(2)}°</p>
        <p>風速（描画距離）: ${distance.toFixed(2)} px</p>
        <p>描画速度: ${drawingSpeed.toFixed(4)} px/ms</p>
        <p>カバレッジ係数: ${coverageFactor.toFixed(2)}</p>
      `;

        // ここでAJAXやfetchを用いてサーバへデータ送信可能
        // 例：
        // fetch('/save_wind_data', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({
        //     wind_direction: angleDegrees,
        //     wind_speed: distance,
        //     coverage: coverageFactor,
        //     // 必要に応じて座標やタイムスタンプも追加
        //   })
        // });
      }
    </script>
  </body>
</html>
```
