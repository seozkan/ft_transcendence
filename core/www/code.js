"use strict";

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

// Variables
export const accessToken = getCookie('access_token');
export const csrfToken = getCookie('csrftoken');

export async function getUserInfo() {

    if (!accessToken) {
        console.error('error: access token is missing or invalid');
        return;
    }
    else {
        document.getElementById("offcanvasButton").classList.remove("d-none")
    }

    try {
        const response = await fetch('https://localhost/api/user', {
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

export function isUserLoggedIn() {
    return !!accessToken;
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