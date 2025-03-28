// server.ts
import express = require('express');
import bodyParser = require('body-parser');
// import * as mysql from 'mysql2/promise'; // MySQL関連のインポートをコメントアウト
import cors = require('cors');

const app = express();
const port = 3000; // 適宜ポート番号を設定

// ミドルウェアの設定
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public')); // public フォルダを静的ファイルとして提供

// MySQL 接続プールの設定（環境に合わせて修正してください）
// const pool = mysql.createPool({
//   host: 'localhost',
//   user: 'your_username',
//   password: 'your_password',
//   database: 'your_database',
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0
// });

// POST エンドポイント：風データを保存する
app.post('/api/save_wind_data', async (req: express.Request, res: express.Response) => {
  try {
    const {
      measurement_group_id,
      measured_at,
      wind_direction,
      wind_speed,
      latitude,
      longitude,
      coverage  // 必要に応じた追加情報（今回のテーブルには登録しませんが、拡張可能）
    } = req.body;

    // wind_measurements テーブルにデータを挿入
    // const sql = `
    //   INSERT INTO wind_measurements
    //   (measurement_group_id, measured_at, wind_direction, wind_speed, latitude, longitude)
    //   VALUES (?, ?, ?, ?, ?, ?)
    // `;
    // const [result] = await pool.execute(sql, [
    //   measurement_group_id,
    //   measured_at,
    //   wind_direction,
    //   wind_speed,
    //   latitude,
    //   longitude
    // ]);

    // データ保存の代わりに成功メッセージを返す
    res.json({ message: 'データを正常に受け取りました' });
  } catch (error) {
    console.error('Error saving wind data:', error);
    res.status(500).json({ message: 'データ保存に失敗しました', error });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
