#!/bin/bash
# Aşama 1 doğrulaması: çıktıları rapor için ekran görüntüsü/metin olarak kaydet.
# Kullanım: bash scripts/dogrula.sh | tee rapor/asama1_cikti.txt
P="docker compose exec -T mysql-primary mysql -uroot -proot_sifre yemekhane"
R="docker compose exec -T mysql-replica mysql -uroot -proot_sifre yemekhane"

echo "=== 1) Servis durumu ==="; docker compose ps -a
echo; echo "=== 2) Kaynakta sayımlar (12 tablo / 3 view / 4 prosedür) ==="
$P -e "SELECT (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='yemekhane' AND table_type='BASE TABLE') tablo, (SELECT COUNT(*) FROM information_schema.views WHERE table_schema='yemekhane') view_sayisi, (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema='yemekhane') prosedur, (SELECT COUNT(*) FROM kullanicilar) kullanici, (SELECT COUNT(*) FROM yemekler) yemek, (SELECT COUNT(*) FROM menuler) menu, (SELECT COUNT(*) FROM rezervasyonlar) rezervasyon;" 2>/dev/null
echo; echo "=== 3) Kaynakta 100 TL yükleme (kullanıcı 6) ==="
$P -e "CALL sp_bakiye_yukle(6, 100.00);" 2>/dev/null
sleep 2
echo; echo "=== 4) Replikada aynı kayıt görünüyor mu? ==="
$R -e "SELECT id, kullanici_id, tur, tutar, olusturma_zamani FROM bakiye_hareketleri ORDER BY id DESC LIMIT 2;" 2>/dev/null
echo; echo "=== 5) Replikaya yazma denemesi (hata vermeli) ==="
$R -e "UPDATE yemekhaneler SET kapasite = 1 WHERE id = 1;" 2>&1 | grep -v Warning
echo; echo "=== 6) Replikasyon durumu ==="
$R -e "SHOW REPLICA STATUS\G" 2>/dev/null | grep -E "Replica_IO_Running|Replica_SQL_Running|Seconds_Behind_Source|Retrieved_Gtid_Set|Executed_Gtid_Set"
