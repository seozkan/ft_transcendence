"use strict";

import { router, accessToken, csrfToken } from '../../code.js';

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
      try {
        const response = await fetch('https://localhost/api/update_ui', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-CSRFToken': csrfToken
          },
          body: formData
        });

        if (response.status == 409) {
          nicknameInput.classList.add('is-invalid');
          InvalidUsername.innerHTML = 'Bu kullanıcı adı daha önce alınmış!';
        }
        else if (!response.ok) {
          console.error('error: an error occurred while updating avatar and username');
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