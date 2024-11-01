"use strict";

import { csrfToken } from '../../code.js';

export function init(params) {
    document.getElementById('tfaButton').addEventListener('click', function (event) {
        event.preventDefault();
        const tfaCode = document.getElementById('password').value;
        tfa_login(tfaCode);
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

        if (response.redirected) {
            window.location.href = response.url;
        } else {
            const errorData = await response.json();
            console.error('Error:', errorData.error);
            document.getElementById('password').classList.add('is-invalid');
        }
    }
}

