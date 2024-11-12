    "use strict";
import Router from '../../router.js';

export let router = null
export let accessToken = null
export let csrfToken = null

document.addEventListener('DOMContentLoaded', async () => {
    accessToken = getCookie('access_token');
    csrfToken = getCookie('csrftoken');

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

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

export async function getUserInfo(username) {
    try {
        const response = await fetch(`https://localhost/api/users/${username}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('network error:', response.status);
        }

        const user = await response.json();
        return user;
    } catch (error) {
        console.error('error:', error);
    }
}

export async function getUserName() {
    try {
        const response = await fetch(`https://localhost/api/get_username`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('network error:', response.status);
        }

        const data = await response.json();
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

        if (!response.ok) {
            console.error('network error: ' + response.status);
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

//Check Notifications
async function updateNotifications() {
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
            console.error('network error:', response.status);
            return;
        }

        const data = await response.json();

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
    if (accessToken) {
        await updateNotifications();
    }
})();