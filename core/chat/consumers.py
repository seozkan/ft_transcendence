import json
from channels.generic.websocket import AsyncWebsocketConsumer
from datetime import datetime

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = str(self.scope['url_route']['kwargs']['room_id'])
        self.room_group_name = f'chat_{self.room_id}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data['message']
        user = self.scope['user'].username
        avatar = self.scope['user'].avatar.url

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'user': user,
                'avatar': avatar
            }
        )

    async def chat_message(self, event):
        message = event['message']
        user = event['user']
        avatar = event['avatar']
        await self.send(text_data=json.dumps({
            'message': message,
            'user': user,
            'avatar': avatar
        }))

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        if self.scope["user"].is_anonymous:
            await self.close()
            return

        self.notification_group_name = f'notifications_{self.scope["user"].username}'

        await self.channel_layer.group_add(
            self.notification_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'notification_group_name'):
            await self.channel_layer.group_discard(
                self.notification_group_name,
                self.channel_name
            )

    async def notify(self, event):
        message_data = {
            'type': 'notification',
            'title': event.get('title'),
            'message': event.get('message'),
            'timestamp': event.get('timestamp'),
            'data': event.get('data', {})
        }

        await self.send(text_data=json.dumps(message_data))

    async def invite(self, event):
        message_data = {
            'type': 'invite',
            'title': event.get('title'),
            'message': event.get('message'),
            'timestamp': event.get('timestamp'),
            'data': event.get('data', {})
        }
        
        await self.send(text_data=json.dumps(message_data))

    async def invite_accepted(self, event):
        message_data = {
            'type': 'invite_accepted',
            'title': event.get('title'),
            'message': event.get('message'),
            'timestamp': event.get('timestamp'),
            'data': event.get('data', {})
        }
        
        await self.send(text_data=json.dumps(message_data))

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            notification_type = data.get('type')
            target_username = data.get('username')
            title = data.get('title')
            message = data.get('message')
            extra_data = data.get('data', {})

            target_group_name = f'notifications_{target_username}'
            
            await self.channel_layer.group_send(
                target_group_name,
                {
                    'type': notification_type,
                    'title': title,
                    'message': message,
                    'data': extra_data,
                    'timestamp': datetime.now().isoformat()
                }
            )
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'error': 'Invalid JSON format'
            }))