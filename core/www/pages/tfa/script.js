"use strict";

import { csrfToken } from '../../code.js';

document.getElementById('tfa-form').addEventListener('submit', function (event) {
    event.preventDefault();
    const tfaCode = document.getElementById('password');
    tfa_login(tfaCode.value);
});

async function tfa_login(tfaCode) {
    const url = 'https://localhost/accounts/tfa_login';

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({ tfaCode: tfaCode })
    });

    if (response.ok) {
        window.location.href = 'https://localhost/profile';
    } else {
        const errorData = await response.json();
        console.error('Error:', errorData.error);
        document.getElementById('password').classList.add('is-invalid');
    }
}