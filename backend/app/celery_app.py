from celery import Celery

from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "aiops",
    broker=settings.redis_url or "memory://",
    backend=settings.redis_url or "cache+memory://",
)

celery_app.conf.task_always_eager = settings.redis_url is None
