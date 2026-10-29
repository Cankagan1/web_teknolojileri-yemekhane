-- ============================================================================
-- Aşama 4: Yemekhane Müdürlüğü değişiklik talebi (tek migration dosyası)
--   1) Yarım porsiyon: öğle ve akşam, ücret tam fiyatın %60'ı. Kahvaltıda yok.
--   2) Alerjen uyarısı: kullanıcı profilinde alerjenlerini seçer.
-- Mevcut veri bozulmaz: yeni sütunların varsayılanı 'tam' olduğu için geçmiş
-- rezervasyonlar tam porsiyon sayılır.
-- Çalışan sistemde kaynakta BİR KEZ çalıştırılır; replikaya GTID ile kendiliğinden geçer.
-- Boş kurulumda docker-entrypoint bu dosyayı 01 ve 02'den sonra otomatik çalıştırır.
-- ============================================================================
SET NAMES utf8mb4;
USE yemekhane;

-- 1) Yarım porsiyon ----------------------------------------------------------
-- yarim_porsiyon_orani: NULL = bu öğünde yarım porsiyon yok, 0.60 = tam fiyatın %60'ı
ALTER TABLE ogunler ADD COLUMN yarim_porsiyon_orani DECIMAL(3,2) NULL;
UPDATE ogunler SET yarim_porsiyon_orani = 0.60 WHERE id IN (2, 3);  -- 2 = Öğle, 3 = Akşam

ALTER TABLE rezervasyonlar
  ADD COLUMN porsiyon ENUM('tam','yarim') NOT NULL DEFAULT 'tam' AFTER durum;

-- 2) Alerjen tercihleri ------------------------------------------------------
CREATE TABLE kullanici_alerjenleri (
  kullanici_id INT NOT NULL,
  alerjen_id INT NOT NULL,
  PRIMARY KEY (kullanici_id, alerjen_id),
  FOREIGN KEY (kullanici_id) REFERENCES kullanicilar(id) ON DELETE CASCADE,
  FOREIGN KEY (alerjen_id) REFERENCES alerjenler(id)
) ENGINE=InnoDB;

-- 3) sp_rezervasyon_yap: porsiyon parametresi eklendi ------------------------
DROP PROCEDURE IF EXISTS sp_rezervasyon_yap;

DELIMITER $$

CREATE PROCEDURE sp_rezervasyon_yap(IN p_kullanici_id INT, IN p_menu_id INT, IN p_porsiyon VARCHAR(5))
BEGIN
  DECLARE v_rol VARCHAR(20);
  DECLARE v_bakiye DECIMAL(10,2);
  DECLARE v_tarih DATE;
  DECLARE v_son_saat TIME;
  DECLARE v_kapasite INT;
  DECLARE v_ogr_fiyat DECIMAL(8,2);
  DECLARE v_per_fiyat DECIMAL(8,2);
  DECLARE v_oran DECIMAL(3,2);
  DECLARE v_fiyat DECIMAL(8,2);
  DECLARE v_porsiyon VARCHAR(5);
  DECLARE v_dolu INT;
  DECLARE v_rez_id INT;
  DECLARE v_durum VARCHAR(10);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  SET v_porsiyon = COALESCE(p_porsiyon, 'tam');
  IF v_porsiyon NOT IN ('tam', 'yarim') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Geçersiz porsiyon seçimi.';
  END IF;

  START TRANSACTION;

  SELECT rol, bakiye INTO v_rol, v_bakiye FROM kullanicilar WHERE id = p_kullanici_id FOR UPDATE;
  IF v_rol IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Kullanıcı bulunamadı.';
  END IF;

  SELECT m.tarih, o.son_rezervasyon_saati, y.kapasite, m.ogrenci_fiyat, m.personel_fiyat, o.yarim_porsiyon_orani
    INTO v_tarih, v_son_saat, v_kapasite, v_ogr_fiyat, v_per_fiyat, v_oran
    FROM menuler m
    JOIN ogunler o ON o.id = m.ogun_id
    JOIN yemekhaneler y ON y.id = m.yemekhane_id
   WHERE m.id = p_menu_id
     FOR UPDATE OF m;
  IF v_tarih IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Menü bulunamadı.';
  END IF;

  IF v_porsiyon = 'yarim' AND v_oran IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Bu öğünde yarım porsiyon yoktur.';
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
  IF v_porsiyon = 'yarim' THEN
    SET v_fiyat = ROUND(v_fiyat * v_oran, 2);
  END IF;
  IF v_bakiye < v_fiyat THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Bakiye yetersiz.';
  END IF;

  IF v_rez_id IS NULL THEN
    INSERT INTO rezervasyonlar (kullanici_id, menu_id, porsiyon) VALUES (p_kullanici_id, p_menu_id, v_porsiyon);
    SET v_rez_id = LAST_INSERT_ID();
  ELSE
    UPDATE rezervasyonlar SET durum = 'aktif', porsiyon = v_porsiyon, olusturma_zamani = NOW() WHERE id = v_rez_id;
  END IF;

  INSERT INTO bakiye_hareketleri (kullanici_id, tur, tutar, rezervasyon_id)
  VALUES (p_kullanici_id, 'rezervasyon', -v_fiyat, v_rez_id);
  UPDATE kullanicilar SET bakiye = bakiye - v_fiyat WHERE id = p_kullanici_id;

  COMMIT;
  SELECT v_rez_id AS rezervasyon_id, v_bakiye - v_fiyat AS yeni_bakiye, v_fiyat AS odenen_tutar;
END$$

DELIMITER ;
