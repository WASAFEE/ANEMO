-- weather
-- windテーブル
CREATE TABLE weather.wind (
    id SERIAL PRIMARY KEY,
    measurement_group_id INT NOT NULL,  -- 同時刻の測定グループを識別するためのID
    measured_at TIMESTAMP NOT NULL,
    wind_direction FLOAT NOT NULL,      -- 風向（0〜360度）
    wind_speed FLOAT NOT NULL,          -- 風速（m/s）
    latitude DOUBLE PRECISION NOT NULL, -- 緯度
    longitude DOUBLE PRECISION NOT NULL, -- 経度
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- グループ単位の検索を高速化するためのインデックス
CREATE INDEX idx_measurement_group_id ON weather.wind(measurement_group_id);