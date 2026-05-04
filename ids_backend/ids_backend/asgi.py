import os
import django

from django.core.asgi import get_asgi_application
from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ids_backend.settings')

django.setup()  # ✅ wake Django up FIRST

import api.routing  # ✅ now it's safe

application = ProtocolTypeRouter(
    {
        'http': get_asgi_application(),
        'websocket': AuthMiddlewareStack(
            URLRouter(api.routing.websocket_urlpatterns)
        ),
    }
)