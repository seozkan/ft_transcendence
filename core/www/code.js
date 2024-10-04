import { Router, routes } from './router.js';

const router = new Router(routes);

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

export function isUserLoggedIn() {
    const accessToken = getCookie('access_token');

    if (accessToken) return true;
    return false;
}

document.addEventListener("DOMContentLoaded", () => {
    document.body.addEventListener("click", (event) => {
        if (event.target.matches("a[data-link]")) {
            event.preventDefault();
            const url = event.target.href.split("/");
            router.loadRoute(...url.slice(3));
        }
    });
});

document.querySelectorAll('.offcanvas-body ul a').forEach(link => {
    link.addEventListener('click', () => {
        const offcanvasElement = document.getElementById('sidebar');
        const offcanvas = bootstrap.Offcanvas.getInstance(offcanvasElement);
        offcanvas.hide();
    });
});

const showToastMessage = (x) => {
    const toast = document.querySelector('.toast');
    if (toast) {
        document.querySelector('.toast .toast-body').innerHTML = x;
        new bootstrap.Toast(toast).show();
    } else {
        console.error('error: toast element not found');
    }
};

//Logout

document.getElementById('logout').addEventListener('click', async () => {
    try {

        document.getElementById("offcanvasButton").classList.add("d-none")

        const response = await fetch('https://localhost/accounts/logout', {
            method: 'GET',
        });

        if (!response.ok) {
            console.error('network error: ' + response.status);
        }

        document.cookie = "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        showToastMessage('Çıkış Yapıldı!')
    } catch (error) {
        console.error('error:', error);
    }
})