-- weather
-- windテーブル
CREATE TABLE weather.wind (
    id INT AUTO_INCREMENT PRIMARY KEY,
    measurement_group_id INT NOT NULL,  -- 同時刻の測定グループを識別するためのID
    measured_at DATETIME NOT NULL,
    wind_direction FLOAT NOT NULL,      -- 風向（0〜360度）
    wind_speed FLOAT NOT NULL,          -- 風速（m/s）
    latitude DOUBLE NOT NULL,           -- 緯度
    longitude DOUBLE NOT NULL,          -- 経度
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX(measurement_group_id)         -- グループ単位の検索を高速化
);