CREATE TABLE wind_measurements (
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

INSERT INTO wind_measurements (measurement_group_id, measured_at, wind_direction, wind_speed, latitude, longitude)
VALUES
(1, '2025-03-25 09:30:00', 90.0, 3.5, 35.681236, 139.767125),
(1, '2025-03-25 09:30:00', 95.0, 4.2, 35.689500, 139.691700),
(1, '2025-03-25 09:30:00', 85.0, 3.8, 35.658034, 139.701636);

-- 特定グループ（measurement_group_id = 1）のデータ取得
SELECT *
FROM wind_measurements
WHERE measurement_group_id = 1;

SELECT *
FROM wind_measurements
WHERE measurement_group_id = (
    SELECT measurement_group_id
    FROM wind_measurements
    ORDER BY measured_at DESC
    LIMIT 1
);
