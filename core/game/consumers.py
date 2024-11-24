import json
from channels.generic.websocket import AsyncWebsocketConsumer
import asyncio

PADDLE_WIDTH = 1
PADDLE_HEIGHT = 0.5
PADDLE_DEPTH = 4
BALL_RADIUS = 0.5

FIELD_WIDTH = 40
FIELD_DEPTH = 20

class GameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            self.room_id = self.scope['url_route']['kwargs'].get('room_id')
            self.room_group_name = f'game_{self.room_id}'
            
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            await self.accept()
            
            if not hasattr(self.channel_layer, "game_states"):
                self.channel_layer.game_states = {}
            
            if self.room_id not in self.channel_layer.game_states:
                self.channel_layer.game_states[self.room_id] = {
                    "players": [],
                    "is_game_active": False,
                    "ready_players": set(),
                    "player_usernames": {"left": None, "right": None},
                    "paddle_positions": {},
                    "scores": {"left": 0, "right": 0},
                    "ball_position": {"x": 0, "z": 0},
                    "ball_velocity": {"x": 5, "z": 5}
                }

            game_state = self.channel_layer.game_states[self.room_id]

            if len(game_state["players"]) >= 2:
                await self.close()
                return

            username = self.scope["user"].username

            if len(game_state["players"]) == 0:
                self.player_side = "left"
                game_state["player_usernames"]["left"] = username
                game_state["paddle_positions"][username] = {
                    "x": -19.5,
                    "z": 0
                }
            else:
                self.player_side = "right"
                game_state["player_usernames"]["right"] = username
                game_state["paddle_positions"][username] = {
                    "x": 19.5,
                    "z": 0
                }

            game_state["players"].append(self.channel_name)

            await self.send(text_data=json.dumps({
                "type": "player_assignment",
                "side": self.player_side,
                "username": username,
                "opponent_username": game_state["player_usernames"]["right" if self.player_side == "left" else "left"],
                "initial_position": game_state["paddle_positions"][username]
            }))

            if len(game_state["players"]) == 2:
                other_side = "left" if self.player_side == "right" else "right"
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "opponent_joined",
                        "opponent_username": username,
                        "side": self.player_side
                    }
                )
                await self.start_game()

        except Exception as e:
            print(f"Connection Error: {e}")
            await self.close()
            return

    async def start_game(self):
        for countdown in range(3, 0, -1):
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "game_start_message",
                    "countdown": countdown,
                }
            )
            await asyncio.sleep(1)

        self.channel_layer.game_states[self.room_id]["is_game_active"] = True
        self.channel_layer.game_states[self.room_id]["ball_position"] = {"x": 0, "z": 0}
        self.channel_layer.game_states[self.room_id]["ball_velocity"] = {"x": 5, "z": 5}
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "game_start_message",
                "countdown": 0,
            }
        )
        
        asyncio.create_task(self.update_ball_position())

    async def update_ball_position(self):
        while self.channel_layer.game_states[self.room_id]["is_game_active"]:
            self.channel_layer.game_states[self.room_id]["ball_position"]["x"] += self.channel_layer.game_states[self.room_id]["ball_velocity"]["x"] * 0.1
            self.channel_layer.game_states[self.room_id]["ball_position"]["z"] += self.channel_layer.game_states[self.room_id]["ball_velocity"]["z"] * 0.1

            if abs(self.channel_layer.game_states[self.room_id]["ball_position"]["z"]) >= FIELD_DEPTH / 2 - BALL_RADIUS:
                self.channel_layer.game_states[self.room_id]["ball_velocity"]["z"] *= -1

            await self.check_paddle_collision()

            if abs(self.channel_layer.game_states[self.room_id]["ball_position"]["x"]) - BALL_RADIUS >= FIELD_WIDTH / 2:
                if self.channel_layer.game_states[self.room_id]["ball_position"]["x"] > 0:
                    self.channel_layer.game_states[self.room_id]["scores"]["left"] += 1
                else:
                    self.channel_layer.game_states[self.room_id]["scores"]["right"] += 1
                await self.reset_ball_and_notify()

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "ball_update_message",
                    "position": self.channel_layer.game_states[self.room_id]["ball_position"],
                }
            )

            await asyncio.sleep(0.016)

    async def check_paddle_collision(self):
        left_username = self.channel_layer.game_states[self.room_id]["player_usernames"]["left"]
        right_username = self.channel_layer.game_states[self.room_id]["player_usernames"]["right"]
        
        paddle_positions = self.channel_layer.game_states[self.room_id]["paddle_positions"]
        
        if left_username in paddle_positions and right_username in paddle_positions:
            left_paddle = paddle_positions[left_username]
            right_paddle = paddle_positions[right_username]

            ball_pos = self.channel_layer.game_states[self.room_id]["ball_position"]
            ball_vel = self.channel_layer.game_states[self.room_id]["ball_velocity"]

            if (ball_vel["x"] < 0 and
                abs(ball_pos["x"] - left_paddle["x"]) <= PADDLE_WIDTH/2 + BALL_RADIUS and
                abs(ball_pos["z"] - left_paddle["z"]) <= (PADDLE_DEPTH/2 + BALL_RADIUS)):
                
                rel_z = (ball_pos["z"] - left_paddle["z"]) / (PADDLE_DEPTH / 2)
                speed = (ball_vel["x"]**2 + ball_vel["z"]**2)**0.5
                self.channel_layer.game_states[self.room_id]["ball_velocity"]["x"] = speed * 0.8
                self.channel_layer.game_states[self.room_id]["ball_velocity"]["z"] = speed * rel_z

            elif (ball_vel["x"] > 0 and
                  abs(ball_pos["x"] - right_paddle["x"]) <= PADDLE_WIDTH/2 + BALL_RADIUS and
                  abs(ball_pos["z"] - right_paddle["z"]) <= (PADDLE_DEPTH/2 + BALL_RADIUS)):
                
                rel_z = (ball_pos["z"] - right_paddle["z"]) / (PADDLE_DEPTH/2)
                speed = (ball_vel["x"]**2 + ball_vel["z"]**2)**0.5
                self.channel_layer.game_states[self.room_id]["ball_velocity"]["x"] = -speed * 0.8
                self.channel_layer.game_states[self.room_id]["ball_velocity"]["z"] = speed * rel_z * 0.8

    async def reset_ball_and_notify(self):
        game_state = self.channel_layer.game_states[self.room_id]
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "score.update",
                "scores": game_state["scores"],
            }
        )
        
        if (self.room_id in self.channel_layer.game_states and 
            (game_state["scores"]["left"] >= 10 or game_state["scores"]["right"] >= 10)):
            
            game_state["is_game_active"] = False
            winner = "left" if game_state["scores"]["left"] >= 10 else "right"
            winner_username = game_state["player_usernames"][winner]
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "game.over",
                    "winner": winner,
                    "winner_username": winner_username,
                    "scores": game_state["scores"]
                }
            )
            return
        
        if self.room_id in self.channel_layer.game_states:
            await asyncio.sleep(0.2)
            game_state["ball_position"] = {"x": 0, "z": 0}
            game_state["ball_velocity"] = {"x": 5 * (-1 if game_state["ball_velocity"]["x"] > 0 else 1), "z": 5}

    async def receive(self, text_data):
        data = json.loads(text_data)
        
        if data.get("type") == "paddle_update":
            username = data["username"]
            position = data["position"]
            
            if (username == self.channel_layer.game_states[self.room_id]["player_usernames"]["left"] and 
                position["x"] < 0) or (
                username == self.channel_layer.game_states[self.room_id]["player_usernames"]["right"] and 
                position["x"] > 0):
                
                self.channel_layer.game_states[self.room_id]["paddle_positions"][username] = {
                    "x": position["x"],
                    "z": position["z"]
                }
                
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "paddle_update_message",
                        "username": username,
                        "position": position,
                    }
                )

    async def paddle_update_message(self, event):
        username = event["username"]
        position = event["position"]
        
        if username in self.channel_layer.game_states[self.room_id]["paddle_positions"]:
            self.channel_layer.game_states[self.room_id]["paddle_positions"][username] = {
                "x": position["x"],
                "z": position["z"]
            }
            
            await self.send(text_data=json.dumps({
                "type": "paddle_update",
                "username": username,
                "position": self.channel_layer.game_states[self.room_id]["paddle_positions"][username],
            }))

    async def game_start_message(self, event):
        await self.send(text_data=json.dumps({
            "type": "game_start",
            "countdown": event["countdown"],
        }))

    async def ball_update_message(self, event):
        await self.send(text_data=json.dumps({
            "type": "ball_update",
            "position": event["position"],
        }))

    async def score_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "score_update",
            "scores": event["scores"],
        }))

    async def disconnect(self, close_code):
        if hasattr(self, "player_side"):
            username = self.scope["user"].username
            
            if self.channel_name in self.channel_layer.game_states[self.room_id]["players"]:
                self.channel_layer.game_states[self.room_id]["players"].remove(self.channel_name)
            
            if self.player_side in self.channel_layer.game_states[self.room_id]["player_usernames"]:
                self.channel_layer.game_states[self.room_id]["player_usernames"][self.player_side] = None

            if username in self.channel_layer.game_states[self.room_id]["paddle_positions"]:
                del self.channel_layer.game_states[self.room_id]["paddle_positions"][username]

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "player_disconnected",
                    "side": self.player_side
                }
            )

        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def player_disconnected(self, event):
        await self.send(text_data=json.dumps({
            "type": "player_disconnected",
            "side": event["side"],
            "message": "Opponent has left the game!"
        }))

    async def opponent_joined(self, event):
        await self.send(text_data=json.dumps({
            "type": "opponent_joined",
            "opponent_username": event["opponent_username"],
            "side": event["side"]
        }))

    async def game_over(self, event):
        if self.room_id in self.channel_layer.game_states:
            await self.send(text_data=json.dumps({
                "type": "game_over",
                "winner": event["winner"],
                "winner_username": event["winner_username"],
                "scores": event["scores"]
            }))