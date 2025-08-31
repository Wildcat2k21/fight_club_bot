# Лучше фиксировать версию Node, чтобы не словить несовместимости при обновлении образа
FROM node:20-alpine  

# Устанавливаем рабочую директорию
WORKDIR /app  

# Копируем package.json и package-lock.json (если есть)
COPY package*.json ./  

# Ставим зависимости
RUN npm ci --omit=dev  # в проде лучше npm ci (он быстрее и повторяемый)

# Копируем исходники
COPY . .  

# Указываем порт
EXPOSE 3030  

# Запуск
CMD ["npm", "run", "start"]
