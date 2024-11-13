import json
from channels.generic.websocket import AsyncWebsocketConsumer

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