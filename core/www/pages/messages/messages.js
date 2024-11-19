"use strict";

import { getCookie } from '../../code.js';

export async function init() {
    let chatSocket = null;
    const messages = document.getElementById('messages');
    messages.scrollTop = messages.scrollHeight;

    function formatDate(dateString) {
        const date = new Date(dateString);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${hours}:${minutes} ${day}/${month}/${year}`;
    }

    async function getFriends() {
        const accessToken = getCookie('access_token');

        try {
            const response = await fetch('https://localhost/api/get_friends', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('error', data);
                return;
            }

            const friendsList = document.querySelector('.card-body');
            friendsList.innerHTML = '';

            if (data.length === 0) {
                const noFriendsMessage = document.createElement('p');
                noFriendsMessage.className = 'text-white text-center m-0';
                noFriendsMessage.textContent = 'Mesajlaşmak için arkadaş ekleyin.';
                friendsList.appendChild(noFriendsMessage);
            }

            data.forEach(friend => {
                const friendItem = document.createElement('ul');
                friendItem.className = 'list-unstyled mb-0';
                friendItem.innerHTML = `
                    <li class="p-2 border-bottom" style="border-bottom: 1px solid rgba(255,255,255,.3) !important;">
                      <div class="d-flex justify-content-between link-light">
                        <div class="d-flex flex-row">
                          <img src="${friend.avatar_url}" alt="avatar"
                            class="rounded-circle d-flex align-self-center me-3 shadow-1-strong" style="height: 3rem; width: 3rem; object-fit: cover;">
                          <div class="pt-1">
                            <p class="fw-bold mb-0">${friend.username}</p>
                            <!--<p class="small text-white">Hello, Are you there?</p>-->
                          </div>
                        </div>
                        <div class="pt-1">
                          <!--<p class="small text-white mb-1">Just now</p>-->
                          <!--<span class="badge bg-danger float-end">1</span>-->
                        </div>
                      </div>
                    </li>
                `;
                friendItem.querySelector('li').addEventListener('click', async () => {
                    const roomId = await getOrCreateRoom(friend.username);
                    await connectToChat(roomId);
                    await getMessages(roomId);
                    setupSendMessage(roomId);
                });
                friendsList.appendChild(friendItem);
            });
        } catch (error) {
            console.error('Error:', error);
        }
    }

    function setupSendMessage(roomId) {
        const sendGroup = document.querySelector('#sendGroup textarea');

        sendGroup.focus();
        sendGroup.onkeyup = function (e) {
            if (e.key === 'Enter') {
                document.querySelector('#sendGroup button').click();
            }
        };

        document.querySelector('#sendGroup button').onclick = async () => {
            const messageInputDom = document.querySelector('#sendGroup textarea');
            const message = messageInputDom.value;
            if (chatSocket && messageInputDom.value !== '') {
                chatSocket.send(JSON.stringify({
                    'message': message
                }));
                await saveMessage(roomId, message);
            }
            messageInputDom.value = '';
        };
    }

    async function getMessages(roomId) {
        try {
            const response = await fetch('https://localhost/chat/get_messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getCookie('access_token')}`,
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    'room_id': roomId
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('Error fetching messages:', data);
                return;
            }

            let messagesList = document.querySelector('#messages ul');
            messagesList.innerHTML = '';

            data.messages.forEach(message => {
                const messageItem = document.createElement('li');
                messageItem.className = 'd-flex justify-content-between mb-4';

                messageItem.innerHTML = `
                    <img src="${message.avatar}" alt="avatar"
                        class="rounded-circle d-flex align-self-start me-3 shadow-1-strong" style="height: 3rem; width: 3rem; object-fit: cover;">
                    <div class="card mask-custom w-100">
                        <div class="card-header d-flex justify-content-between p-3"
                            style="border-bottom: 1px solid rgba(255,255,255,.3);">
                            <p class="fw-bold mb-0">${message.user}</p>
                            <p class="text-light small mb-0"><i class="far fa-clock"></i> ${formatDate(message.created_date)}</p>
                        </div>
                        <div class="card-body">
                            <p class="mb-0">
                                ${message.content}
                            </p>
                        </div>
                    </div>
                `;
                messagesList.appendChild(messageItem);
            });
            messagesList.innerHTML += `
                <li id="sendGroup" class="ms-5">
                  <div data-mdb-input-init class="form-outline form-white">
                    <textarea class="form-control" rows="4"></textarea>
                    <button type="button" data-mdb-button-init data-mdb-ripple-init class="btn btn-light btn-rounded float-end mt-3">Gönder</button>
                  </div>
                </li>
            `

            messages.scrollTop = messages.scrollHeight;
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async function connectToChat(roomId) {
        if (chatSocket) {
            chatSocket.close();
        }

        chatSocket = new WebSocket(
            'wss://'
            + window.location.host
            + '/ws/chat/'
            + roomId
            + '/'
        );

        chatSocket.onmessage = async (e) => {
            const data = JSON.parse(e.data);
            const messagesList = document.querySelector('#messages ul');
            const newMessage = document.createElement('li');
            newMessage.className = 'd-flex justify-content-between mb-4';

            newMessage.innerHTML = `
                <img src="${data.avatar}" alt="avatar"
                    class="rounded-circle d-flex align-self-start me-3 shadow-1-strong" style="height: 3rem; width: 3rem; object-fit: cover;">
                <div class="card mask-custom w-100">
                    <div class="card-header d-flex justify-content-between p-3"
                        style="border-bottom: 1px solid rgba(255,255,255,.3);">
                        <p class="fw-bold mb-0">${data.user}</p>
                        <p class="text-light small mb-0"><i class="far fa-clock"></i> ${formatDate(new Date())}</p>
                    </div>
                    <div class="card-body">
                        <p class="mb-0">
                            ${data.message}
                        </p>
                    </div>
                </div>
            `;
            messagesList.insertBefore(newMessage, messagesList.querySelector('#sendGroup'));
            messages.scrollTop = messages.scrollHeight;
        };

        chatSocket.onclose = function (e) {
            console.log('chat socket closed');
        };
    }

    async function getOrCreateRoom(username) {
        const csrfToken = getCookie('csrftoken');

        try {
            const response = await fetch('https://localhost/chat/get_room', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({
                    'second_user': username
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('error', data);
                return;
            }

            return data.room_id;
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async function saveMessage(roomId, message) {
        try {
            const response = await fetch('https://localhost/chat/save_message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getCookie('access_token')}`,
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    'room_id': roomId,
                    'content': message
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('Error saving message:', data);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    await getFriends();
}