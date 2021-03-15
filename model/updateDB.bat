psql -U postgres -c "create database roadmaster with owner postgres encoding = 'UNICODE';"
psql -U postgres -d roadmaster -f ./roadmaster.sql
pause