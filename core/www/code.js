"use strict";
import Router from '../../router.js';

export let router = null;
export let notificationSocket = null;
export let chatSocket = null;

document.addEventListener('DOMContentLoaded', async () => {
    router = new Router();

    router.addRoute('/', 'home');
    router.addRoute('/profile', 'profile');
    router.addRoute('/personalize', 'personalize');
    router.addRoute('/404', '404');
    router.addRoute('/tfa', 'tfa');
    router.addRoute('/login', 'login');
    router.addRoute('/register', 'register');
    router.addRoute('/messages', 'messages');
    router.addRoute('/pong', 'pong');
    router.addRoute('/leaderboard', 'leaderboard');
    router.addRoute('/notification', 'notification');

    await router.navigate(window.location, true);

    window.addEventListener('popstate', async () => {
        const location = window.location;
        await router.navigate(location, true);
    });

    document.body.addEventListener('click', async (event) => {
        if (event.target.tagName === 'A' && !event.target.hasAttribute('data-no-router')) {
            event.preventDefault();
            const location = event.target.href;
            await router.navigate(location);
        }
    });
});


export function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

export async function getUserInfo(username) {
    const accessToken = getCookie('access_token');

    try {
        const response = await fetch(`https://localhost/api/users/${username}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('error:', data);
            return;
        }

        return data;
    } catch (error) {
        console.error('error:', error);
    }
}

export async function getUserName() {
    const accessToken = getCookie('access_token');

    try {
        const response = await fetch(`https://localhost/api/get_username`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('error:', response);
            return;
        }

        return data.username;
    } catch (error) {
        console.error('error:', error);
    }
}

// Sidebar
document.querySelectorAll('.offcanvas-body ul a').forEach(link => {
    link.addEventListener('click', () => {
        const offcanvasElement = document.getElementById('sidebar');
        const offcanvas = bootstrap.Offcanvas.getInstance(offcanvasElement);
        offcanvas.hide();
    });
});

// Toast Message
export const showToastMessage = (message) => {
    const toast = document.querySelector('#toastMessage');
    if (toast) {
        toast.querySelector('.toast-body').innerHTML = message;
        new bootstrap.Toast(toast).show();
    } else {
        console.error('error: toast element not found');
    }
};

// Invite Message
export const showInviteMessage = async (header = 'Bildirim', message, notification) => {
    const toast = document.querySelector('#inviteMessage');
    const header_text = toast.querySelector('.toast-header h6');
    const username = await getUserName();

    header_text.innerHTML = header;
    const toastBody = toast.querySelector('.toast-body');
    
    const buttons = `
        <div>${message}</div>
        <div class="mt-2">
            <button class="btn btn-light btn-sm me-2" id="acceptInvite">Kabul Et</button>
            <button class="btn btn-light btn-sm" data-bs-dismiss="toast">Reddet</button>
        </div>
    `;
    toastBody.innerHTML = buttons;
    
    document.getElementById('acceptInvite').addEventListener('click', async () => {
        const toastInstance = bootstrap.Toast.getInstance(toast);
        toastInstance.hide();
        
        
        if (notification.data && notification.data.sender) {
            await notificationSocket.send(JSON.stringify({
                'type': 'invite_accepted',
                'username': notification.data.sender,
                'title': 'Davet Kabul Edildi',
                'message': `${username} oyun davetinizi kabul etti`,
                'data': {
                    'sender': username,
                    'roomId' : notification.data.roomId
                }
            }));
            await router.navigate(`/pong?room=${notification.data.roomId}`);
        }
    });

    new bootstrap.Toast(toast).show();
};

//Logout
document.getElementById('logout').addEventListener('click', async () => {
    try {
        const header = document.querySelector('header');

        const response = await fetch('https://localhost/accounts/logout', {
            method: 'GET',
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('error: ', data);
            return;
        }

        header.classList.add('d-none');
        document.cookie = "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        showToastMessage('Çıkış Yapıldı!')
        if (notificationSocket)
            notificationSocket.close();
    } catch (error) {
        console.error('error:', error);
    }
})

//Personalize Button
document.getElementById('personalizeButton').addEventListener('click', async (e) => {
    bootstrap.Modal.getInstance(document.getElementById('settings')).hide();
    await router.navigate('/personalize');
});

// QrCode
async function fetchQRCode() {
    const accessToken = getCookie('access_token');

    try {
        const response = await fetch('https://localhost/api/generate_tfa', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('network Error:', response.status);
            return;
        }

        const data = await response.json();
        const base64Image = data.qrCode;
        document.getElementById('qr-code').src = `data:image/png;base64,${base64Image}`;
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

//Switch
const switchElement = document.getElementById('tfaswitch');
switchElement.addEventListener('change', async function () {
    const bootstrapSwitchModal = new bootstrap.Modal(document.getElementById('tfaModal'), {
        keyboard: false,
        backdrop: 'static'
    });
    if (switchElement.checked) {
        const bootstrapSettingsModal = bootstrap.Modal.getInstance(document.getElementById('settings'));
        bootstrapSettingsModal.hide();
        bootstrapSwitchModal.show();
        await fetchQRCode();
    }
});

//Check Notifications
async function updateNotifications() {
    const accessToken = getCookie('access_token');
    if (!accessToken) return;

    const notificationSpan = document.querySelector('#notification span');
    try {
        const response = await fetch('https://localhost/accounts/check_notifications', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('network error:', data);
            return;
        }

        const data = await response.json();
        notificationSpan.innerHTML = data.notifications ? data.notifications.length : '0';
    } catch (error) {
        console.warn('Bildirimler kontrol edilirken hata oluştu:', error);
        notificationSpan.innerHTML = '0';
    }
}

(async () => {
    const accessToken = getCookie('access_token');
    if (accessToken) {
        await updateNotifications();
    }
})();

async function initializeNotificationSocket() {
    if (notificationSocket && notificationSocket.readyState === WebSocket.OPEN) {
        console.log('Notification socket already connected');
        return notificationSocket;
    }

    notificationSocket = new WebSocket(
        'wss://' + window.location.host + '/ws/notifications/'
    );

    notificationSocket.onopen = function() {
        console.log('notification socket connection successful');
    };

    notificationSocket.onmessage = async function (e) {
        const notification = JSON.parse(e.data);
        
        if (notification.type === 'invite_accepted' || notification.type === 'invite') {
            if(notification.type === 'invite') {
                await showInviteMessage(notification.title, notification.message, notification);
            }
            if (notification.type === 'invite_accepted') {
                await router.navigate(`/pong?room=${notification.data.roomId}`);
                showToastMessage('Davet Kabul Edildi!');
            }
            return;
        }
    };

    notificationSocket.onerror = function (e) {
        console.error('notifiy socket error:', e);
    };

    notificationSocket.onclose = function (e) {
        console.log('notification socket connection closed');
    };

    return notificationSocket;
}

export async function ConnectNotificationSocket() {
    const accessToken = getCookie('access_token');
    
    if (accessToken) {
        if (!notificationSocket) {
            notificationSocket = await initializeNotificationSocket();
        }
    }
}
