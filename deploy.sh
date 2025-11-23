#!/bin/sh

set -e

CONTAINER_NAME="fight-bot"
IMAGE_NAME="fight-bot"

echo "Остановка и удаление контейнера (если существует)..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

echo "Удаление образа (если существует)..."
docker rmi $IMAGE_NAME 2>/dev/null || true

echo "Сборка образа..."
docker build -t $IMAGE_NAME .

echo "Образ готов, запуск контейнера..."
docker run -d \
  --name $CONTAINER_NAME \
  --restart always \
  -e TZ=Europe/Moscow \
  -p 3030:3030 \
  -v $(pwd)/sqlite/app.db:/app/sqlite/app.db \
  -v $(pwd)/log.txt:/app/log.txt \
  -v $(pwd)/src/config.json:/app/src/config.json \
  $IMAGE_NAME

echo "Контейнер запущен. Логи:"
docker logs -f $CONTAINER_NAME
