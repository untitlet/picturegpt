# Быстрый старт с улучшениями

## 🚀 Запуск всех сервисов

```bash
# Клонирование и настройка
cp .env.example .env
# Отредактируйте .env, особенно OPENROUTER_API_KEY и пароли

# Запуск
docker-compose up -d

# Проверка статуса
docker-compose ps
```

## 📊 Мониторинг

После запуска доступны:

- **Grafana**: http://localhost:3001 (admin / admin_password_change_me)
- **Prometheus**: http://localhost:9090
- **MinIO Console**: http://localhost:9001 (minio_admin / minio_secure_password_change_me)
- **API Metrics**: http://localhost:3000/metrics

## 🔍 Проверка работы S3

```bash
# Проверка доступности MinIO
curl http://localhost:9000/minio/health/live

# Проверка создания бакета
docker exec ai_generator_minio_init mc ls myminio/bx-images
```

## 📈 Просмотр метрик

```bash
# Метрики API
curl http://localhost:3000/metrics

# Логирование worker
docker logs -f ai_generator_worker

# Статистика очередей Redis
docker exec ai_generator_redis redis-cli INFO stats
```

## 🛠 Отладка

```bash
# Логи всех сервисов
docker-compose logs -f

# Перезапуск конкретного сервиса
docker-compose restart worker

# Очистка и пересоздание
docker-compose down -v
docker-compose up -d
```
