echo "Сборка образа..."

docker build -t "fight-bot" .

echo "Образ готов, запуск контейнера..."

docker run -d \
  --name fight-bot \
  --restart always \
  -e TZ=Europe/Moscow \
  -p 3030:3030 \
  -v $(pwd)/sqlite/app.db:/app/sqlite/app.db \
  -v $(pwd)/log.txt:/app/log.txt \
  fight-bot

echo "Контейнер запущен..."