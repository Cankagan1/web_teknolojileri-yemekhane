-- Replika bu kullanıcıyla kaynağa bağlanır (ders projesi: şifre açıkta, gerçek hayatta olmaz)
CREATE USER 'repl'@'%' IDENTIFIED BY 'repl_sifre';
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'%';
