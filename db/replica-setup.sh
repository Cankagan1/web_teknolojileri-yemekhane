#!/bin/bash
# Replikayı bir kez kurar: kaynaktan ilk kopyayı alır, GTID replikasyonunu başlatır, replikayı salt okunur yapar.
set -euo pipefail
export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"
R="mysql -h mysql-replica -uroot"

# Daha önce kurulduysa tekrar kurma (docker compose up -d bu kapsayıcıyı yeniden başlatır)
KURULU=$($R -N -e "SELECT COUNT(*) FROM performance_schema.replication_connection_configuration")
if [ "$KURULU" != "0" ]; then
  echo "Replikasyon zaten kurulu, çıkılıyor."
  exit 0
fi

echo "1/4 Replika temizleniyor..."
$R -e "RESET MASTER;"

echo "2/4 Kaynaktan ilk kopya alınıyor..."
mysqldump -h mysql-primary -uroot --databases "$MYSQL_DATABASE" \
  --single-transaction --routines --triggers --events --no-tablespaces \
  --set-gtid-purged=ON | $R

echo "3/4 Replikasyon başlatılıyor..."
$R -e "CHANGE REPLICATION SOURCE TO SOURCE_HOST='mysql-primary', SOURCE_USER='repl', SOURCE_PASSWORD='repl_sifre', SOURCE_AUTO_POSITION=1, GET_SOURCE_PUBLIC_KEY=1; START REPLICA;"

DURUM=""
for i in $(seq 1 30); do
  DURUM=$($R -e "SHOW REPLICA STATUS\G")
  if echo "$DURUM" | grep -q "Replica_IO_Running: Yes" && echo "$DURUM" | grep -q "Replica_SQL_Running: Yes"; then
    break
  fi
  sleep 2
done
echo "$DURUM" | grep -q "Replica_SQL_Running: Yes" || { echo "Replikasyon başlamadı"; echo "$DURUM"; exit 1; }

echo "4/4 Replika salt okunur yapılıyor..."
$R -e "SET PERSIST read_only=ON; SET PERSIST super_read_only=ON;"
echo "Tamam."
