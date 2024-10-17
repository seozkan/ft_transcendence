"use strict";

import { accessToken, csrfToken } from '../../code.js';
import router from '../../router.js';

export function init() {
  document.getElementById("personalizeSendButton").addEventListener("click", async (event) => {
    event.preventDefault();
    const avatar = document.getElementById('avatarFileInput').files[0];
    const nicknameInput = document.getElementById('nicknameInput');
  
    const formData = new FormData();
    formData.append('avatar', avatar);
    formData.append('username', nicknameInput.value);
  
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
        console.error('error: an error occurred while updating avatar and username');
      } else {
        router.navigate('/profile');
      }
    } catch (error) {
      console.error('error:', error);
    }
  });
}