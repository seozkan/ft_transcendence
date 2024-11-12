"use strict";
import Router from '../../router.js';

export let router = null

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
    const toast = document.querySelector('.toast');
    if (toast) {
        document.querySelector('.toast .toast-body').innerHTML = message;
        new bootstrap.Toast(toast).show();
    } else {
        console.error('error: toast element not found');
    }
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

    const notificationSpan = document.querySelector('#notification span');
    try {
        const response = await fetch('https://localhost/accounts/check_notifications', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('network error:', data);
            return;
        }

        if (data.notifications) {
            notificationSpan.innerHTML = data.notifications.length;
        } else {
            notificationSpan.innerHTML = '0';
        }
    } catch (error) {
        console.error('error:', error);
    }
}

(async () => {
    const accessToken = getCookie('access_token');
    if (accessToken) {
        await updateNotifications();
    }
})();