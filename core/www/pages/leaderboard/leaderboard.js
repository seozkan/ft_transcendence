"use strict";

import { router , getCookie } from '../../code.js';

export async function init(params) {
    async function getAllPlayer() {
        const accessToken = getCookie('access_token');
    
        const tbody = document.querySelector("tbody");

        if (!accessToken) {
            console.error('error: access token is missing or invalid');
            return;
        }

        try {
            const response = await fetch("/api/get_all_player", {
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

    await getAllPlayer();
}