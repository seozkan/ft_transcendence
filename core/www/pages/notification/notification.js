"use strict";

import { accessToken, csrfToken } from '../../code.js';

export async function init(params) {
    async function acceptFriendRequest(username, notificationDiv) {
        try {
            const response = await fetch('https://localhost/api/accept_friend_request', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({ username: username })
            });

            if (!response.ok) {
                console.error('Network error:', response.status);
                return;
            }

            const data = await response.json();

            if (data.success) {
                console.log('Friend request approved');
                await checkNotifications();
            } else {
                console.error('Error:', data.error);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async function rejectFriendRequest(username, notificationDiv) {
        try {
            const response = await fetch('https://localhost/api/reject_friend_request', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({ username: username })
            });

            if (!response.ok) {
                console.error('Network error:', response.status);
                return;
            }

            const data = await response.json();

            if (data.success) {
                console.log('Friend request rejected');
                await checkNotifications();
            } else {
                console.error('Error:', data.error);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async function checkNotifications() {
        try {
            const notificationBody = document.getElementById('notificationBody');
            const notificationSpan = document.querySelector('#notification span');

            const response = await fetch('https://localhost/accounts/check_notifications', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('Network error:', response.status);
                return;
            }

            const data = await response.json();

            notificationBody.innerHTML = '';
            
            if (data.notifications && data.notifications.length > 0) {
                notificationSpan.innerHTML = data.notifications.length;

                data.notifications.forEach(notification => {
                    const date = new Date(notification.created_at);
                    const formattedDate = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} ${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                    
                    const notificationDiv = document.createElement("div");
                    notificationDiv.classList.add("d-flex", "alert", "alert-warning", "justify-content-between", "align-items-center");
                    notificationDiv.setAttribute("role", "alert");
                    notificationDiv.innerHTML = `
                        <span class="me-3">${formattedDate}</span>
                        <div class="d-flex flex-grow-1 align-items-center">
                            <i class="fas fa-user-friends me-2"></i>
                            <h6 class="mb-0"><span class="text-danger">${notification.message}</span> sizinle arkadaş olmak istiyor</h6>
                        </div>
                        <div class="d-flex flex-md-row flex-column">
                            <button class="btn btn-success accept-btn me-2">Onayla</button>
                            <button class="btn btn-danger reject-btn">Reddet</button>
                        </div>
                    `;

                    notificationDiv.querySelector('.accept-btn').addEventListener("click", async () => await acceptFriendRequest(notification.message, notificationDiv));
                    notificationDiv.querySelector('.reject-btn').addEventListener("click", async () => await rejectFriendRequest(notification.message, notificationDiv));

                    notificationBody.appendChild(notificationDiv);
                });
            } else {
                notificationSpan.innerHTML = '0';
                notificationBody.innerHTML = `
                <div class="d-flex alert alert-light justify-content-between align-items-center" role="alert">
                    <h6>Herhangi bir bildiriminiz yok.</h6>
                </div>`;
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    await checkNotifications();
}
