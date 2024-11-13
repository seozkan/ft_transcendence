"use strict";

import { router, getCookie } from '../../code.js';

export async function init(params) {
  document.getElementById("personalizeForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const InvalidUsername = document.getElementById('InvalidUsername');
    const avatar = document.getElementById('avatarFileInput').files[0];
    const nicknameInput = document.getElementById('nicknameInput');

    const formData = new FormData();
    formData.append('avatar', avatar);
    formData.append('username', nicknameInput.value);

    async function update_ui() {
      const accessToken = getCookie('access_token');
      const csrfToken = getCookie('csrftoken');

      try {
        const response = await fetch('https://localhost/api/update_ui', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-CSRFToken': csrfToken
          },
          body: formData
        });

        if (!response.ok) {
          if (response.status == 409) {
            nicknameInput.classList.add('is-invalid');
            InvalidUsername.innerHTML = 'Bu kullanıcı adı daha önce alınmış!';
          }
          else if (response.status === 404) {
            console.error('error: user not found.');
          } else {
            const data = await response.json();
            console.error('error:', data);
          }
          return;
        } else {
          await router.navigate('/profile');
        }
      } catch (error) {
        console.error('error:', error);
      }
    };

    await update_ui();
  });
}