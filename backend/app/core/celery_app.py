from celery import Celery
from celery.schedules import crontab

from app.core.config import get_settings


def create_celery_app() -> Celery:
    settings = get_settings()
    celery_app = Celery(
        "lifelink",
        broker=settings.celery_broker_url or settings.redis_url,
        backend=settings.celery_result_backend or settings.redis_url,
        include=[
            "app.services.notifications.tasks",
            "app.services.ml_tasks",
            "app.services.gov_tasks",
            "app.services.system_tasks",
        ],
    )
    celery_app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
        # Periodic tasks — consumed by the celery-beat container. Previously the
        # beat service ran with an empty schedule (no-op container).
        beat_schedule={
            # Nightly federated aggregation: aggregate local hospital models
            # into the global model (FedAvg) at 02:30 UTC.
            "nightly-federated-aggregation": {
                "task": "system.aggregate_global_model",
                "schedule": crontab(hour=2, minute=30),
            },
            # Every 6 hours: refresh system-level predictions so dashboards
            # never serve stale forecasts.
            "periodic-prediction-refresh": {
                "task": "system.generate_predictions",
                "schedule": crontab(hour="*/6", minute=0),
                "args": ("resource_demand",),
            },
        },
    )
    return celery_app


celery_app = create_celery_app()
