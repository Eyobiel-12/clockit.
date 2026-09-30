-- Demodata uit het design: Eetcafé De Kade. Alle accounts hebben wachtwoord "wachtwoord12".
-- Diensten worden relatief aan de huidige week aangemaakt (tijden in UTC).
SET NAMES utf8mb4;

INSERT INTO restaurants (id, name, address, lat, lng, radius_m, invite_code, invite_expires_at)
VALUES (1, 'Eetcafé De Kade', 'Kade 1, Amsterdam', 52.377956, 4.897070, 120, '482913', NOW() + INTERVAL 7 DAY);

SET @pw = '$2b$10$oLaErRTiP1xNyd.3xlrzwOXzm0SUAlibZRl9L1AzsYmi7jL/Nkkd2';

INSERT INTO users (restaurant_id, first_name, last_name, email, password_hash, role, department, status) VALUES
  (1, 'Sanne',  'de Vries',  'sanne@dekade.nl', @pw, 'owner',    'Bediening', 'active'),
  (1, 'Mehmet', 'Yilmaz',    'mehmet@mail.nl',  @pw, 'manager',  'Keuken',    'active'),
  (1, 'Priya',  'Ramdin',    'priya@mail.nl',   @pw, 'employee', 'Bar',       'active'),
  (1, 'Fatima', 'El Amrani', 'fatima@mail.nl',  @pw, 'employee', 'Keuken',    'active'),
  (1, 'Joost',  'Bakker',    'joost@mail.nl',   @pw, 'employee', 'Bar',       'active'),
  (1, 'Daan',   'Visser',    'daan@mail.nl',    @pw, 'employee', 'Bediening', 'active'),
  (1, 'Lars',   'Jansen',    'lars@mail.nl',    @pw, 'employee', 'Afwas',     'active'),
  (1, 'Noor',   'Bouzid',    'noor@mail.nl',    @pw, 'employee', 'Bediening', 'pending'),
  (1, 'Tim',    'Kok',       'tim@mail.nl',     @pw, 'employee', 'Keuken',    'active');

-- Afgeronde diensten eerder deze week (d = 0 is maandag). Alleen dagen vóór vandaag.
SET @mon = DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY);

INSERT INTO shifts (restaurant_id, user_id, clock_in_at, clock_out_at, distance_m, accuracy_m)
SELECT 1, u.id,
       TIMESTAMP(@mon + INTERVAL s.d DAY, s.t),
       TIMESTAMP(@mon + INTERVAL s.d DAY, s.t) + INTERVAL s.mins MINUTE,
       s.dist, s.acc
FROM (
  SELECT 'sanne@dekade.nl' AS email, 0 AS d, '07:00:00' AS t, 480 AS mins, 12 AS dist, 8 AS acc
  UNION ALL SELECT 'sanne@dekade.nl', 1, '07:00:00', 450, 10, 7
  UNION ALL SELECT 'sanne@dekade.nl', 3, '07:00:00', 495, 14, 9
  UNION ALL SELECT 'mehmet@mail.nl',  0, '08:00:00', 360, 31, 14
  UNION ALL SELECT 'mehmet@mail.nl',  1, '08:00:00', 360, 28, 12
  UNION ALL SELECT 'mehmet@mail.nl',  2, '07:30:00', 550, 30, 15
  UNION ALL SELECT 'priya@mail.nl',   1, '14:00:00', 345, 8, 6
  UNION ALL SELECT 'priya@mail.nl',   2, '14:00:00', 330, 9, 6
  UNION ALL SELECT 'priya@mail.nl',   3, '14:00:00', 360, 7, 5
  UNION ALL SELECT 'fatima@mail.nl',  0, '09:00:00', 420, 40, 20
  UNION ALL SELECT 'fatima@mail.nl',  2, '09:00:00', 435, 35, 18
  UNION ALL SELECT 'fatima@mail.nl',  3, '09:00:00', 420, 38, 22
  UNION ALL SELECT 'joost@mail.nl',   0, '16:00:00', 240, 20, 10
  UNION ALL SELECT 'joost@mail.nl',   1, '11:00:00', 680, 18, 11
  UNION ALL SELECT 'joost@mail.nl',   2, '16:00:00', 270, 22, 12
  UNION ALL SELECT 'daan@mail.nl',    0, '10:00:00', 420, 15, 9
  UNION ALL SELECT 'daan@mail.nl',    2, '10:00:00', 420, 16, 9
  UNION ALL SELECT 'lars@mail.nl',    1, '17:00:00', 285, 25, 12
  UNION ALL SELECT 'lars@mail.nl',    3, '17:00:00', 285, 24, 11
  UNION ALL SELECT 'tim@mail.nl',     0, '09:00:00', 375, 19, 10
  UNION ALL SELECT 'tim@mail.nl',     2, '09:00:00', 390, 21, 10
) AS s
JOIN users u ON u.email = s.email
WHERE @mon + INTERVAL s.d DAY < CURDATE();

-- Wie nu in dienst is (open diensten).
INSERT INTO shifts (restaurant_id, user_id, clock_in_at, clock_out_at, distance_m, accuracy_m)
SELECT 1, u.id, NOW() - INTERVAL s.ago MINUTE, NULL, s.dist, s.acc
FROM (
  SELECT 'sanne@dekade.nl' AS email, 192 AS ago, 12 AS dist, 8 AS acc
  UNION ALL SELECT 'mehmet@mail.nl', 188, 31, 14
  UNION ALL SELECT 'priya@mail.nl',  100, 8, 6
  UNION ALL SELECT 'fatima@mail.nl',  70, 44, 38
) AS s
JOIN users u ON u.email = s.email;

-- Open correcties.
INSERT INTO corrections (restaurant_id, user_id, shift_id, type, reason)
SELECT 1, u.id,
       (SELECT sh.id FROM shifts sh WHERE sh.user_id = u.id AND sh.clock_in_at >= @mon
          AND TIMESTAMPDIFF(MINUTE, sh.clock_in_at, sh.clock_out_at) > 600 LIMIT 1),
       'forgot_clock_out', 'Vergeten uit te klokken'
FROM users u WHERE u.email = 'joost@mail.nl';

INSERT INTO corrections (restaurant_id, user_id, type, reason)
SELECT 1, u.id, 'forgot_clock_in', 'Vergeten in te klokken, begon om 14:00'
FROM users u WHERE u.email = 'priya@mail.nl';

INSERT INTO corrections (restaurant_id, user_id, type, reason)
SELECT 1, u.id, 'other', 'Pauze niet geregistreerd'
FROM users u WHERE u.email = 'tim@mail.nl';
