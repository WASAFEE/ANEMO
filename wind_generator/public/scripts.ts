// public/script.ts

interface WindData {
    measurement_group_id: number;
    measured_at: string;
    wind_direction: number;
    wind_speed: number;
    latitude: number;
    longitude: number;
    coverage: number;
  }
  
  // マップの初期化（初期表示位置は例として東京付近）
  const map = L.map('map').setView([35.681236, 139.767125], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  
  let startLatLng: L.LatLng | null = null;
  let startTime: number = 0;
  let tempLine: L.Polyline | null = null;
  
  // 結果表示用の div
  const infoDiv = document.getElementById('info') as HTMLDivElement;
  
  function onMapMouseDown(e: L.LeafletMouseEvent): void {
    startLatLng = e.latlng;
    startTime = Date.now();
    if (tempLine) {
      map.removeLayer(tempLine);
      tempLine = null;
    }
  }
  
  function onMapMouseUp(e: L.LeafletMouseEvent): void {
    if (!startLatLng) return;
    const endLatLng = e.latlng;
    const endTime = Date.now();
  
    // ここでは緯度経度の差から簡易的な距離を算出（正確な距離計算には測地線計算等が必要）
    const dx = endLatLng.lng - startLatLng.lng;
    const dy = endLatLng.lat - startLatLng.lat;
    const distance = Math.sqrt(dx * dx + dy * dy);
  
    // 風向は、atan2 を使って算出（単位は度、0〜360°）
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;
  
    // 描画時間（ミリ秒）と距離から描画速度を算出
    const timeDiff = endTime - startTime; // ms
    const drawingSpeed = timeDiff > 0 ? distance / timeDiff : 0;
  
    // 例：描画速度に応じたカバレッジ係数（速いほど大きな値、最大 5 まで）
    const coverageFactor = Math.min(1 + drawingSpeed * 10, 5);
  
    // 結果表示
    infoDiv.innerHTML = `
      <p>風向: ${angle.toFixed(2)}°</p>
      <p>風速（軌跡距離の指標）: ${distance.toFixed(4)}</p>
      <p>描画速度: ${drawingSpeed.toFixed(4)}</p>
      <p>カバレッジ係数: ${coverageFactor.toFixed(2)}</p>
    `;
  
    // マップ上に軌跡（ポリライン）を描画
    tempLine = L.polyline([startLatLng, endLatLng], { color: 'blue' }).addTo(map);
  
    // 登録する地点はここでは始点（startLatLng）を採用
    const measuredAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const payload: WindData = {
      measurement_group_id: Number((document.getElementById('measurement-group-id') as HTMLInputElement)?.value || -1),
      measured_at: measuredAt,
      wind_direction: angle,
      wind_speed: distance, // 任意の単位（必要に応じて変換）
      latitude: startLatLng.lat,
      longitude: startLatLng.lng,
      coverage: coverageFactor
    };
  
    // サーバー側へ POST リクエストでデータ送信
    fetch('/api/save_wind_data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
      infoDiv.innerHTML += `<p style="color: green;">サーバー登録結果: ${data.message}</p>`;
    })
    .catch(error => {
      console.error('Error:', error);
      infoDiv.innerHTML += `<p style="color: red;">エラーが発生しました。</p>`;
    });
  
    // 次回入力のために初期化
    startLatLng = null;
  }
  
  // マウスイベントの登録
  map.on('mousedown', onMapMouseDown);
  map.on('mouseup', onMapMouseUp);
  