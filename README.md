# Yemekhane Otomasyonu

## Çalıştırma
    docker compose up -d
    docker compose ps          # hepsi healthy, replica-setup Exited (0)

Sıfırdan başlamak için (veritabanı init dosyaları yalnızca boş volume'da çalışır):

    docker compose down -v && docker compose up -d

## Bağlantı bilgileri
| Servis | Adres | Kullanıcı / şifre |
|---|---|---|
| Arayüz (Apache) | http://localhost:8080 | - |
| mysql-primary (yazma) | localhost:3307, veritabanı `yemekhane` | uygulama / uygulama_sifre (root / root_sifre) |
| mysql-replica (okuma) | localhost:3308 | aynı |
| redis | localhost:6379 | şifresiz |

Uygulama kullanıcıları (şifre hepsinde `Sifre123!`):
yonetici@kampus.edu.tr, personel1@kampus.edu.tr, ogrenci01@kampus.edu.tr ... ogrenci25@kampus.edu.tr

## Doğrulama
    bash scripts/dogrula.sh | tee rapor/asama1_cikti.txt
