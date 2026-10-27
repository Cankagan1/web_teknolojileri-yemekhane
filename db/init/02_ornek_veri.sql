SET NAMES utf8mb4;
USE yemekhane;

-- Referans veriler
INSERT INTO yemekhaneler (ad, kapasite) VALUES ('Merkez', 400), ('Mühendislik', 60);
INSERT INTO ogunler (ad, son_rezervasyon_saati) VALUES ('Kahvaltı','07:00:00'), ('Öğle','10:00:00'), ('Akşam','15:00:00');
INSERT INTO yemek_kategorileri (ad, sira) VALUES
 ('Kahvaltılık',1),('Çorba',2),('Ana Yemek',3),('Pilav ve Makarna',4),('Salata ve Meze',5),('Tatlı',6),('İçecek',7);
INSERT INTO alerjenler (ad) VALUES
 ('Gluten'),('Kabuklu deniz ürünleri'),('Yumurta'),('Balık'),('Yer fıstığı'),('Soya'),('Süt'),
 ('Sert kabuklu yemişler'),('Kereviz'),('Hardal'),('Susam'),('Sülfitler'),('Acı bakla'),('Yumuşakçalar');

-- 52 yemek (kategori, ad, kalori, vejetaryen) - id'ler eklenme sırasına göre 1..52
INSERT INTO yemekler (kategori_id, ad, kalori, vejetaryen) VALUES
 (1,'Haşlanmış yumurta',78,1),(1,'Beyaz peynir',150,1),(1,'Zeytin',60,1),(1,'Bal ve tereyağı',120,1),
 (1,'Domates salatalık',30,1),(1,'Menemen',180,1),(1,'Simit',280,1),(1,'Reçel',70,1),
 (2,'Mercimek çorbası',150,1),(2,'Ezogelin çorbası',160,1),(2,'Domates çorbası',120,1),
 (2,'Tarhana çorbası',140,1),(2,'Yayla çorbası',130,1),(2,'Tavuk suyu çorba',110,0),
 (3,'Izgara tavuk',320,0),(3,'Etli nohut',380,0),(3,'Kuru fasulye',340,0),(3,'Izgara köfte',360,0),
 (3,'Tavuk sote',300,0),(3,'Karnıyarık',350,0),(3,'Mercimek köftesi',230,1),(3,'Sebzeli güveç',210,1),
 (3,'Fırın levrek',290,0),(3,'Hünkar beğendi',420,0),(3,'Ispanaklı börek',310,1),(3,'Mantı',400,0),
 (3,'Etli türlü',330,0),(3,'Zeytinyağlı türlü',190,1),
 (4,'Pirinç pilavı',210,1),(4,'Bulgur pilavı',190,1),(4,'Sebzeli makarna',240,1),
 (4,'Şehriyeli pilav',220,1),(4,'Spagetti napoliten',260,1),(4,'Erişte',230,1),
 (5,'Çoban salata',60,1),(5,'Mevsim salata',50,1),(5,'Cacık',70,1),(5,'Havuç tarator',90,1),
 (5,'Yoğurt',80,1),(5,'Piyaz',140,1),(5,'Patlıcan salatası',110,1),
 (6,'Sütlaç',230,1),(6,'Revani',280,1),(6,'Baklava',330,1),(6,'Kemalpaşa tatlısı',300,1),
 (6,'Mevsim meyvesi',70,1),(6,'Kabak tatlısı',250,1),
 (7,'Çay',2,1),(7,'Ayran',60,1),(7,'Komposto',90,1),(7,'Limonata',80,1),(7,'Süt',100,1);

-- yemek-alerjen eşleşmeleri (yemek_id, alerjen_id): 1 Gluten 3 Yumurta 4 Balık 7 Süt 8 Yemiş 9 Kereviz 10 Hardal 11 Susam 12 Sülfit
INSERT INTO yemek_alerjenleri (yemek_id, alerjen_id) VALUES
 (1,3),(2,7),(3,12),(4,7),(6,3),(7,1),(7,11),
 (10,1),(12,1),(12,7),(13,7),(14,9),
 (15,10),(16,9),(18,1),(18,3),(21,1),(23,4),(24,1),(24,7),(25,1),(25,3),(25,7),(26,1),(26,3),(26,7),(27,9),
 (31,1),(32,1),(33,1),(33,9),(34,1),(34,3),
 (37,7),(38,7),(38,8),(39,7),(40,3),(41,11),
 (42,7),(43,1),(43,3),(43,7),(44,1),(44,7),(44,8),(45,1),(45,3),(45,7),(47,8),
 (49,7),(52,7);

-- ------------------------------------------------------------
-- Kullanıcılar, menüler, rezervasyonlar, hareketler, oylar
-- Tarihler kurulum gününe göre üretilir (6 gün önce ... 7 gün sonra).
-- Tüm kullanıcıların şifresi: Sifre123!
-- ------------------------------------------------------------
DELIMITER $$

CREATE PROCEDURE tmp_menu_yemek(IN p_menu INT, IN p_kat INT, IN p_tohum INT)
BEGIN
  DECLARE v_say INT;
  DECLARE v_ofset INT;
  SELECT COUNT(*) INTO v_say FROM yemekler WHERE kategori_id = p_kat;
  SET v_ofset = (p_menu * p_tohum) MOD v_say;
  INSERT IGNORE INTO menu_yemekleri (menu_id, yemek_id)
  SELECT p_menu, id FROM yemekler WHERE kategori_id = p_kat ORDER BY id LIMIT 1 OFFSET v_ofset;
END$$

CREATE PROCEDURE tmp_ornek_veri()
BEGIN
  DECLARE i INT DEFAULT 1;
  DECLARE g INT;
  DECLARE y INT;
  DECLARE o INT;
  DECLARE v_menu INT;
  DECLARE v_rol VARCHAR(20);

  -- 30 kullanıcı: 1 yönetici, 4 personel, 25 öğrenci
  WHILE i <= 30 DO
    SET v_rol = CASE WHEN i = 1 THEN 'yonetici' WHEN i <= 5 THEN 'personel' ELSE 'ogrenci' END;
    INSERT INTO kullanicilar (ad_soyad, email, sifre_hash, rol, ogrenci_no, bakiye)
    VALUES (
      CONCAT(ELT(MOD(i,10)+1,'Ahmet','Ayşe','Mehmet','Zeynep','Mustafa','Elif','Emre','Selin','Can','Deniz'), ' ',
             ELT(MOD(i*3,10)+1,'Yılmaz','Kaya','Demir','Şahin','Çelik','Yıldız','Aydın','Özdemir','Arslan','Doğan')),
      CASE WHEN i = 1 THEN 'yonetici@kampus.edu.tr'
           WHEN i <= 5 THEN CONCAT('personel', i-1, '@kampus.edu.tr')
           ELSE CONCAT('ogrenci', LPAD(i-5, 2, '0'), '@kampus.edu.tr') END,
      '$2b$10$CqHroySRhNQbxVtQwOEFHea/Ib95dFDknCNUA.Xmj3SKyTcN3nr76', v_rol,
      IF(v_rol = 'ogrenci', CONCAT('2024', LPAD(i, 4, '0')), NULL),
      0);
    SET i = i + 1;
  END WHILE;

  -- 84 menü = 2 yemekhane x 3 öğün x 14 gün
  SET g = -6;
  WHILE g <= 7 DO
    SET y = 1;
    WHILE y <= 2 DO
      SET o = 1;
      WHILE o <= 3 DO
        INSERT INTO menuler (yemekhane_id, tarih, ogun_id, ogrenci_fiyat, personel_fiyat)
        VALUES (y, CURDATE() + INTERVAL g DAY, o, ELT(o,25,45,40), ELT(o,40,70,65));
        SET v_menu = LAST_INSERT_ID();
        IF o = 1 THEN
          CALL tmp_menu_yemek(v_menu, 1, 1);
          CALL tmp_menu_yemek(v_menu, 1, 3);
          CALL tmp_menu_yemek(v_menu, 1, 5);
          CALL tmp_menu_yemek(v_menu, 7, 1);
        ELSE
          CALL tmp_menu_yemek(v_menu, 2, 1);
          CALL tmp_menu_yemek(v_menu, 3, 1);
          CALL tmp_menu_yemek(v_menu, 4, 1);
          CALL tmp_menu_yemek(v_menu, IF(o = 2, 5, 6), 1);
        END IF;
        SET o = o + 1;
      END WHILE;
      SET y = y + 1;
    END WHILE;
    SET g = g + 1;
  END WHILE;

  -- yaklaşık 360 rezervasyon: her kullanıcı için menülerin yedide biri
  INSERT INTO rezervasyonlar (kullanici_id, menu_id, durum, olusturma_zamani)
  SELECT k.id, m.id,
         CASE WHEN MOD(k.id * 5 + m.id * 3, 6) = 0 THEN 'iptal'
              WHEN m.tarih < CURDATE() THEN 'kullanildi'
              ELSE 'aktif' END,
         TIMESTAMP(m.tarih - INTERVAL 1 DAY, '12:00:00')
    FROM kullanicilar k
    JOIN menuler m
   WHERE MOD(k.id + m.id, 7) = 0;

  -- bakiye hareketleri: ilk yükleme, rezervasyon ücretleri, iptallerin iadesi
  INSERT INTO bakiye_hareketleri (kullanici_id, tur, tutar, olusturma_zamani)
  SELECT id, 'yukleme', 1500.00, NOW() - INTERVAL 10 DAY FROM kullanicilar;

  INSERT INTO bakiye_hareketleri (kullanici_id, tur, tutar, rezervasyon_id, olusturma_zamani)
  SELECT r.kullanici_id, 'rezervasyon',
         -IF(k.rol = 'ogrenci', m.ogrenci_fiyat, m.personel_fiyat), r.id, r.olusturma_zamani
    FROM rezervasyonlar r
    JOIN kullanicilar k ON k.id = r.kullanici_id
    JOIN menuler m ON m.id = r.menu_id;

  INSERT INTO bakiye_hareketleri (kullanici_id, tur, tutar, rezervasyon_id, olusturma_zamani)
  SELECT r.kullanici_id, 'iade',
         IF(k.rol = 'ogrenci', m.ogrenci_fiyat, m.personel_fiyat), r.id, r.olusturma_zamani + INTERVAL 2 HOUR
    FROM rezervasyonlar r
    JOIN kullanicilar k ON k.id = r.kullanici_id
    JOIN menuler m ON m.id = r.menu_id
   WHERE r.durum = 'iptal';

  -- bakiye her zaman hareketlerin toplamına eşit
  UPDATE kullanicilar k
     SET bakiye = (SELECT COALESCE(SUM(h.tutar), 0) FROM bakiye_hareketleri h WHERE h.kullanici_id = k.id);

  -- kullanılmış rezervasyonların üçte birine değerlendirme
  INSERT INTO degerlendirmeler (kullanici_id, menu_id, puan, yorum)
  SELECT kullanici_id, menu_id, 2 + MOD(id, 4),
         ELT(MOD(id, 4) + 1, 'Lezzetliydi.', 'Porsiyon biraz küçüktü.', 'Sıcak ve tazeydi.', 'Fena değildi.')
    FROM rezervasyonlar
   WHERE durum = 'kullanildi' AND MOD(id, 3) = 0;
END$$

DELIMITER ;

CALL tmp_ornek_veri();
DROP PROCEDURE tmp_ornek_veri;
DROP PROCEDURE tmp_menu_yemek;
