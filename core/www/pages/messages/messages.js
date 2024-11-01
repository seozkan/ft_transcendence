import { csrfToken } from '../../code.js';

export function init() {
    let roomId = null;
    const messages = document.getElementById('messages');
    messages.scrollTop = messages.scrollHeight;

    async function getOrCreateRoom() {
        try {
            const response = await fetch('https://localhost/chat/get_room', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({
                    'second_user': 'elif'
                })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            roomId = data.room_id;
        } catch (error) {
            console.error('Error:', error);
        }
    }

    getOrCreateRoom();

    const chatSocket = new WebSocket(
        'wss://'
        + window.location.host
        + '/ws/chat/'
        + roomId
        + '/'
    );

    chatSocket.onmessage = function (e) {
        const data = JSON.parse(e.data);
        const messagesList = document.querySelector('#messages ul');
        const newMessage = document.createElement('li');
        newMessage.className = 'd-flex justify-content-between mb-4';
        newMessage.innerHTML = `
            <img src="../avatars/default_avatar.jpg" alt="avatar"
                class="rounded-circle d-flex align-self-start me-3 shadow-1-strong" width="60">
            <div class="card mask-custom w-100">
                <div class="card-header d-flex justify-content-between p-3"
                    style="border-bottom: 1px solid rgba(255,255,255,.3);">
                    <p class="fw-bold mb-0">${data.user}</p>
                    <p class="text-light small mb-0"><i class="far fa-clock"></i> 12 dakika önce</p>
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
        console.error('Chat socket closed unexpectedly');
    };

    document.querySelector('#sendGroup textarea').focus();
    document.querySelector('#sendGroup textarea').onkeyup = function (e) {
        if (e.key === 'Enter') {
            document.querySelector('#sendGroup button').click();
        }
    };

    document.querySelector('#sendGroup button').onclick = function () {
        const messageInputDom = document.querySelector('#sendGroup textarea');
        const message = messageInputDom.value;
        chatSocket.send(JSON.stringify({
            'message': message
        }));
        messageInputDom.value = '';
    };
}