SET NAMES utf8mb4;
USE yemekhane;

-- ================= TABLOLAR (12) =================

CREATE TABLE kullanicilar (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ad_soyad VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  sifre_hash CHAR(60) NOT NULL,
  rol ENUM('ogrenci','personel','yonetici') NOT NULL,
  ogrenci_no VARCHAR(12) NULL UNIQUE,
  bakiye DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  olusturma_zamani DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_bakiye_negatif_olamaz CHECK (bakiye >= 0),
  CONSTRAINT ck_ogrenci_no_sadece_ogrenci CHECK (
    (rol = 'ogrenci' AND ogrenci_no IS NOT NULL) OR (rol <> 'ogrenci' AND ogrenci_no IS NULL))
) ENGINE=InnoDB;

CREATE TABLE yemekhaneler (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ad VARCHAR(60) NOT NULL UNIQUE,
  kapasite INT NOT NULL CHECK (kapasite > 0)
) ENGINE=InnoDB;

CREATE TABLE ogunler (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ad VARCHAR(30) NOT NULL UNIQUE,
  son_rezervasyon_saati TIME NOT NULL
) ENGINE=InnoDB;

CREATE TABLE yemek_kategorileri (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ad VARCHAR(40) NOT NULL UNIQUE,
  sira INT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE yemekler (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kategori_id INT NOT NULL,
  ad VARCHAR(80) NOT NULL UNIQUE,
  kalori INT NOT NULL CHECK (kalori >= 0),
  vejetaryen TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (kategori_id) REFERENCES yemek_kategorileri(id)
) ENGINE=InnoDB;

CREATE TABLE alerjenler (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ad VARCHAR(60) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE yemek_alerjenleri (
  yemek_id INT NOT NULL,
  alerjen_id INT NOT NULL,
  PRIMARY KEY (yemek_id, alerjen_id),
  FOREIGN KEY (yemek_id) REFERENCES yemekler(id) ON DELETE CASCADE,
  FOREIGN KEY (alerjen_id) REFERENCES alerjenler(id)
) ENGINE=InnoDB;

CREATE TABLE menuler (
  id INT AUTO_INCREMENT PRIMARY KEY,
  yemekhane_id INT NOT NULL,
  tarih DATE NOT NULL,
  ogun_id INT NOT NULL,
  ogrenci_fiyat DECIMAL(8,2) NOT NULL CHECK (ogrenci_fiyat >= 0),
  personel_fiyat DECIMAL(8,2) NOT NULL CHECK (personel_fiyat >= 0),
  UNIQUE KEY uq_menu (yemekhane_id, tarih, ogun_id),
  FOREIGN KEY (yemekhane_id) REFERENCES yemekhaneler(id),
  FOREIGN KEY (ogun_id) REFERENCES ogunler(id)
) ENGINE=InnoDB;

CREATE TABLE menu_yemekleri (
  menu_id INT NOT NULL,
  yemek_id INT NOT NULL,
  PRIMARY KEY (menu_id, yemek_id),
  FOREIGN KEY (menu_id) REFERENCES menuler(id) ON DELETE CASCADE,
  FOREIGN KEY (yemek_id) REFERENCES yemekler(id)
) ENGINE=InnoDB;

CREATE TABLE rezervasyonlar (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kullanici_id INT NOT NULL,
  menu_id INT NOT NULL,
  durum ENUM('aktif','kullanildi','iptal') NOT NULL DEFAULT 'aktif',
  olusturma_zamani DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_kisi_menu (kullanici_id, menu_id),
  FOREIGN KEY (kullanici_id) REFERENCES kullanicilar(id),
  FOREIGN KEY (menu_id) REFERENCES menuler(id)
) ENGINE=InnoDB;

-- tutar işaretlidir: yükleme/iade (+), rezervasyon (-). Bakiye = hareketlerin toplamı.
CREATE TABLE bakiye_hareketleri (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kullanici_id INT NOT NULL,
  tur ENUM('yukleme','rezervasyon','iade') NOT NULL,
  tutar DECIMAL(10,2) NOT NULL,
  rezervasyon_id INT NULL,
  olusturma_zamani DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (kullanici_id) REFERENCES kullanicilar(id),
  FOREIGN KEY (rezervasyon_id) REFERENCES rezervasyonlar(id)
) ENGINE=InnoDB;

CREATE TABLE degerlendirmeler (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kullanici_id INT NOT NULL,
  menu_id INT NOT NULL,
  puan TINYINT NOT NULL,
  yorum VARCHAR(500) NULL,
  olusturma_zamani DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_oy (kullanici_id, menu_id),
  CONSTRAINT ck_puan CHECK (puan BETWEEN 1 AND 5),
  FOREIGN KEY (kullanici_id) REFERENCES kullanicilar(id),
  FOREIGN KEY (menu_id) REFERENCES menuler(id)
) ENGINE=InnoDB;

-- ================= VIEW'LAR (3) =================

CREATE VIEW v_menu_detay AS
SELECT m.id AS menu_id, m.yemekhane_id, y.ad AS yemekhane_ad, m.tarih,
       m.ogun_id, o.ad AS ogun_ad, o.son_rezervasyon_saati,
       m.ogrenci_fiyat, m.personel_fiyat,
       COALESCE(SUM(ye.kalori), 0) AS toplam_kalori,
       CASE WHEN COUNT(ye.id) > 0 AND MIN(ye.vejetaryen) = 1 THEN 1 ELSE 0 END AS vejetaryen_mi,
       GROUP_CONCAT(ye.ad ORDER BY k.sira, ye.id SEPARATOR ', ') AS yemekler,
       (SELECT GROUP_CONCAT(DISTINCT a.ad ORDER BY a.ad SEPARATOR ', ')
          FROM menu_yemekleri my2
          JOIN yemek_alerjenleri ya ON ya.yemek_id = my2.yemek_id
          JOIN alerjenler a ON a.id = ya.alerjen_id
         WHERE my2.menu_id = m.id) AS alerjenler
FROM menuler m
JOIN yemekhaneler y ON y.id = m.yemekhane_id
JOIN ogunler o ON o.id = m.ogun_id
LEFT JOIN menu_yemekleri my ON my.menu_id = m.id
LEFT JOIN yemekler ye ON ye.id = my.yemek_id
LEFT JOIN yemek_kategorileri k ON k.id = ye.kategori_id
GROUP BY m.id, m.yemekhane_id, y.ad, m.tarih, m.ogun_id, o.ad, o.son_rezervasyon_saati,
         m.ogrenci_fiyat, m.personel_fiyat;

CREATE VIEW v_menu_doluluk AS
SELECT m.id AS menu_id, y.kapasite, COUNT(r.id) AS dolu, y.kapasite - COUNT(r.id) AS bos
FROM menuler m
JOIN yemekhaneler y ON y.id = m.yemekhane_id
LEFT JOIN rezervasyonlar r ON r.menu_id = m.id AND r.durum IN ('aktif','kullanildi')
GROUP BY m.id, y.kapasite;

CREATE VIEW v_menu_puan AS
SELECT m.id AS menu_id, ROUND(AVG(d.puan), 2) AS ortalama_puan, COUNT(d.id) AS oy_sayisi
FROM menuler m
LEFT JOIN degerlendirmeler d ON d.menu_id = m.id
GROUP BY m.id;

-- ================= STORED PROCEDURE'LER (4) =================
-- Hata durumunda Türkçe mesajla SQLSTATE 45000 döner; uygulama bu mesajı arayüze iletir.

DELIMITER $$

CREATE PROCEDURE sp_rezervasyon_yap(IN p_kullanici_id INT, IN p_menu_id INT)
BEGIN
  DECLARE v_rol VARCHAR(20);
  DECLARE v_bakiye DECIMAL(10,2);
  DECLARE v_tarih DATE;
  DECLARE v_son_saat TIME;
  DECLARE v_kapasite INT;
  DECLARE v_ogr_fiyat DECIMAL(8,2);
  DECLARE v_per_fiyat DECIMAL(8,2);
  DECLARE v_fiyat DECIMAL(8,2);
  DECLARE v_dolu INT;
  DECLARE v_rez_id INT;
  DECLARE v_durum VARCHAR(10);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT rol, bakiye INTO v_rol, v_bakiye FROM kullanicilar WHERE id = p_kullanici_id FOR UPDATE;
  IF v_rol IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Kullanıcı bulunamadı.';
  END IF;

  -- menü satırını kilitle: aynı anda gelen rezervasyonlar sırayla işlenir, kapasite aşılmaz
  SELECT m.tarih, o.son_rezervasyon_saati, y.kapasite, m.ogrenci_fiyat, m.personel_fiyat
    INTO v_tarih, v_son_saat, v_kapasite, v_ogr_fiyat, v_per_fiyat
    FROM menuler m
    JOIN ogunler o ON o.id = m.ogun_id
    JOIN yemekhaneler y ON y.id = m.yemekhane_id
   WHERE m.id = p_menu_id
     FOR UPDATE OF m;
  IF v_tarih IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Menü bulunamadı.';
  END IF;

  IF TIMESTAMP(v_tarih, v_son_saat) <= NOW() THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Rezervasyon süresi dolmuş.';
  END IF;

  SELECT COUNT(*) INTO v_dolu FROM rezervasyonlar
   WHERE menu_id = p_menu_id AND durum IN ('aktif','kullanildi');
  IF v_dolu >= v_kapasite THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Menü dolu.';
  END IF;

  SELECT id, durum INTO v_rez_id, v_durum FROM rezervasyonlar
   WHERE kullanici_id = p_kullanici_id AND menu_id = p_menu_id FOR UPDATE;
  IF v_rez_id IS NOT NULL AND v_durum <> 'iptal' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Bu menü için zaten rezervasyonunuz var.';
  END IF;

  IF v_rol = 'ogrenci' THEN SET v_fiyat = v_ogr_fiyat; ELSE SET v_fiyat = v_per_fiyat; END IF;
  IF v_bakiye < v_fiyat THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Bakiye yetersiz.';
  END IF;

  IF v_rez_id IS NULL THEN
    INSERT INTO rezervasyonlar (kullanici_id, menu_id) VALUES (p_kullanici_id, p_menu_id);
    SET v_rez_id = LAST_INSERT_ID();
  ELSE
    -- daha önce iptal edilmiş kayıt yeniden aktif olur (kişi başına menü başına tek kayıt kuralı)
    UPDATE rezervasyonlar SET durum = 'aktif', olusturma_zamani = NOW() WHERE id = v_rez_id;
  END IF;

  INSERT INTO bakiye_hareketleri (kullanici_id, tur, tutar, rezervasyon_id)
  VALUES (p_kullanici_id, 'rezervasyon', -v_fiyat, v_rez_id);
  UPDATE kullanicilar SET bakiye = bakiye - v_fiyat WHERE id = p_kullanici_id;

  COMMIT;
  SELECT v_rez_id AS rezervasyon_id, v_bakiye - v_fiyat AS yeni_bakiye;
END$$

CREATE PROCEDURE sp_rezervasyon_iptal(IN p_kullanici_id INT, IN p_rezervasyon_id INT)
BEGIN
  DECLARE v_durum VARCHAR(10);
  DECLARE v_tarih DATE;
  DECLARE v_son_saat TIME;
  DECLARE v_iade DECIMAL(10,2);
  DECLARE v_bakiye DECIMAL(10,2);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT r.durum, m.tarih, o.son_rezervasyon_saati INTO v_durum, v_tarih, v_son_saat
    FROM rezervasyonlar r
    JOIN menuler m ON m.id = r.menu_id
    JOIN ogunler o ON o.id = m.ogun_id
   WHERE r.id = p_rezervasyon_id AND r.kullanici_id = p_kullanici_id
     FOR UPDATE OF r;
  IF v_durum IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Rezervasyon bulunamadı.';
  END IF;
  IF v_durum <> 'aktif' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Yalnızca aktif rezervasyon iptal edilebilir.';
  END IF;
  IF TIMESTAMP(v_tarih, v_son_saat) <= NOW() THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'İptal süresi dolmuş.';
  END IF;

  -- iade tutarı = bu rezervasyon için en son çekilen ücret
  SELECT -tutar INTO v_iade FROM bakiye_hareketleri
   WHERE rezervasyon_id = p_rezervasyon_id AND tur = 'rezervasyon'
   ORDER BY id DESC LIMIT 1;

  UPDATE rezervasyonlar SET durum = 'iptal' WHERE id = p_rezervasyon_id;
  INSERT INTO bakiye_hareketleri (kullanici_id, tur, tutar, rezervasyon_id)
  VALUES (p_kullanici_id, 'iade', v_iade, p_rezervasyon_id);
  UPDATE kullanicilar SET bakiye = bakiye + v_iade WHERE id = p_kullanici_id;
  SELECT bakiye INTO v_bakiye FROM kullanicilar WHERE id = p_kullanici_id;

  COMMIT;
  SELECT v_bakiye AS yeni_bakiye;
END$$

CREATE PROCEDURE sp_bakiye_yukle(IN p_kullanici_id INT, IN p_tutar DECIMAL(10,2))
BEGIN
  DECLARE v_bakiye DECIMAL(10,2);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_tutar IS NULL OR p_tutar <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Yükleme tutarı sıfırdan büyük olmalı.';
  END IF;
  IF p_tutar > 2000 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tek seferde en fazla 2000 TL yüklenebilir.';
  END IF;

  START TRANSACTION;
  SELECT bakiye INTO v_bakiye FROM kullanicilar WHERE id = p_kullanici_id FOR UPDATE;
  IF v_bakiye IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Kullanıcı bulunamadı.';
  END IF;

  INSERT INTO bakiye_hareketleri (kullanici_id, tur, tutar) VALUES (p_kullanici_id, 'yukleme', p_tutar);
  UPDATE kullanicilar SET bakiye = bakiye + p_tutar WHERE id = p_kullanici_id;
  COMMIT;
  SELECT v_bakiye + p_tutar AS yeni_bakiye;
END$$

-- Turnike: kişi, o gün o yemekhanede o öğün için aktif rezervasyonuyla geçer; rezervasyon "kullanildi" olur.
CREATE PROCEDURE sp_turnike_gecis(IN p_kullanici_id INT, IN p_yemekhane_id INT, IN p_ogun_id INT)
BEGIN
  DECLARE v_rez_id INT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  SELECT r.id INTO v_rez_id
    FROM rezervasyonlar r
    JOIN menuler m ON m.id = r.menu_id
   WHERE r.kullanici_id = p_kullanici_id
     AND m.yemekhane_id = p_yemekhane_id
     AND m.ogun_id = p_ogun_id
     AND m.tarih = CURDATE()
     AND r.durum = 'aktif'
     FOR UPDATE OF r;
  IF v_rez_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Bu öğün için aktif rezervasyon bulunamadı.';
  END IF;

  UPDATE rezervasyonlar SET durum = 'kullanildi' WHERE id = v_rez_id;
  COMMIT;
  SELECT v_rez_id AS rezervasyon_id;
END$$

DELIMITER ;
