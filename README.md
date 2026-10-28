# Yemekhane Otomasyonu

## Çalıştırma
    docker compose up -d --build
    docker compose ps          # hepsi healthy, replica-setup Exited (0)

Sıfırdan başlamak için: `docker compose down -v && docker compose up -d --build`

## Adresler
| Servis | Adres |
|---|---|
| Arayüz | http://localhost:8080 |
| mysql-primary (yazma) | localhost:3307 · kullanıcı uygulama / uygulama_sifre · veritabanı yemekhane |
| mysql-replica (okuma) | localhost:3308 · aynı bilgiler |
| redis | localhost:6379 |

## Deneme kullanıcıları (şifre hepsinde `Sifre123!`)
yonetici@kampus.edu.tr · personel1@kampus.edu.tr · ogrenci01@kampus.edu.tr ... ogrenci25@kampus.edu.tr

## Mimari (Web API + arayüz)
route → controller → repository (SQL yalnızca repository'de). Para işlemleri stored procedure ile.
Yazma ve para hareketleri `mysql-primary`, listeleme `mysql-replica`.
