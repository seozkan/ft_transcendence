"use strict";

import { router, accessToken } from '../../code.js';

export function init(params) {
    async function getAllPlayer() {
        const tbody = document.querySelector("tbody");

        if (!accessToken) {
            console.error('error: access token is missing or invalid');
            return;
        }

        try {
            const response = await fetch("https://localhost/api/get_all_player", {
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
            let i = data.length;
            data.forEach(element => {
                if (element.username) {
                    tbody.insertAdjacentHTML("afterbegin", `<tr>
                        <th scope="row">${i}</th>
                        <td class='username'>${element.username}</td>
                        <td>${element.score}</td>
                    </tr>`);
                    i -= 1;
                }
            });

            tbody.addEventListener('click', async (event) => {
                if (event.target.classList.contains('username')) {
                    await router.navigate(`/profile?username=${event.target.textContent}`);
                }
            });
        } catch (error) {
            console.error('error:', error);
        }
    }

    getAllPlayer();
}