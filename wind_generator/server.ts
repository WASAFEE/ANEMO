// server.ts
import express = require('express');
import bodyParser = require('body-parser');
import { Pool } from 'pg';
import cors = require('cors');

const app = express();
const port = 3000;

// ミドルウェアの設定
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'));

// PostgreSQL 接続プールの設定
const config = require('./environment/local.json');
const pool = new Pool({
  host: config.database.host,
  user: config.database.user,
  password: config.database.password,
  database: config.database.database,
  port: parseInt(config.database.port)
});

// POST エンドポイント：風データを保存する
app.post('/api/save_wind_data', async (req: express.Request, res: express.Response) => {
  const client = await pool.connect();
  try {
    const {
      measurement_group_id,
      measured_at,
      wind_direction,
      wind_speed,
      latitude,
      longitude,
    } = req.body;

    // トランザクションの開始
    await client.query('BEGIN');

    // wind_measurements テーブルにデータを挿入
    const sql = `
      INSERT INTO weather.wind
      (measurement_group_id, measured_at, wind_direction, wind_speed, latitude, longitude)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    await client.query(sql, [
      measurement_group_id,
      measured_at,
      wind_direction,
      wind_speed,
      latitude,
      longitude
    ]);

    // トランザクションのコミット
    await client.query('COMMIT');

    // データ保存の代わりに成功メッセージを返す
    res.json({ message: 'データを正常に保存しました' });
    console.log(`データを正常に保存しました: ${sql}`);
  } catch (error) {
    // エラーが発生した場合はロールバック
    await client.query('ROLLBACK');
    console.error('Error saving wind data:', error);
    res.status(500).json({ message: 'データ保存に失敗しました', error });
  } finally {
    // クライアントを解放
    client.release();
  }
});

app.listen(port, () => {
  console.log(`Server is running on port http://localhost:${port}`);
});
