// public/script.ts
// マップの初期化（初期表示位置は例として東京付近）
var map = L.map('map').setView([35.681236, 139.767125], 14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);
var startLatLng = null;
var startTime = 0;
var tempLine = null;
// 結果表示用の div
var infoDiv = document.getElementById('info');
function onMapMouseDown(e) {
    startLatLng = e.latlng;
    startTime = Date.now();
    if (tempLine) {
        map.removeLayer(tempLine);
        tempLine = null;
    }
}
function onMapMouseUp(e) {
    var _a;
    if (!startLatLng)
        return;
    var endLatLng = e.latlng;
    var endTime = Date.now();
    // ここでは緯度経度の差から簡易的な距離を算出（正確な距離計算には測地線計算等が必要）
    var dx = endLatLng.lng - startLatLng.lng;
    var dy = endLatLng.lat - startLatLng.lat;
    var distance = Math.sqrt(dx * dx + dy * dy);
    // 風向は、atan2 を使って算出（単位は度、0〜360°）
    var angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0)
        angle += 360;
    // 描画時間（ミリ秒）と距離から描画速度を算出
    var timeDiff = endTime - startTime; // ms
    var drawingSpeed = timeDiff > 0 ? distance / timeDiff : 0;
    // 例：描画速度に応じたカバレッジ係数（速いほど大きな値、最大 5 まで）
    var coverageFactor = Math.min(1 + drawingSpeed * 10, 5);
    // 結果表示
    infoDiv.innerHTML = "\n      <p>\u98A8\u5411: ".concat(angle.toFixed(2), "\u00B0</p>\n      <p>\u98A8\u901F\uFF08\u8ECC\u8DE1\u8DDD\u96E2\u306E\u6307\u6A19\uFF09: ").concat(distance.toFixed(4), "</p>\n      <p>\u63CF\u753B\u901F\u5EA6: ").concat(drawingSpeed.toFixed(4), "</p>\n      <p>\u30AB\u30D0\u30EC\u30C3\u30B8\u4FC2\u6570: ").concat(coverageFactor.toFixed(2), "</p>\n    ");
    // マップ上に軌跡（ポリライン）を描画
    tempLine = L.polyline([startLatLng, endLatLng], { color: 'blue' }).addTo(map);
    // 登録する地点はここでは始点（startLatLng）を採用
    var measuredAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    var payload = {
        measurement_group_id: Number(((_a = document.getElementById('measurement-group-id')) === null || _a === void 0 ? void 0 : _a.value) || -1),
        measured_at: measuredAt,
        wind_direction: angle,
        wind_speed: distance,
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
        .then(function (response) { return response.json(); })
        .then(function (data) {
        infoDiv.innerHTML += "<p style=\"color: green;\">\u30B5\u30FC\u30D0\u30FC\u767B\u9332\u7D50\u679C: ".concat(data.message, "</p>");
    })["catch"](function (error) {
        console.error('Error:', error);
        infoDiv.innerHTML += "<p style=\"color: red;\">\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F\u3002</p>";
    });
    // 次回入力のために初期化
    startLatLng = null;
}
// マウスイベントの登録
map.on('mousedown', onMapMouseDown);
map.on('mouseup', onMapMouseUp);
