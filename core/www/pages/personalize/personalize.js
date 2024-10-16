"use strict";

import { accessToken, csrfToken } from '../../code.js';
import router from '../../router.js';

export function init() {
  document.getElementById("nicknameSendButton").addEventListener("click", async (event) => {
    event.preventDefault();
    const carousel = document.getElementById('carouselExampleFade');
    const activeCarousel = carousel.querySelector('.carousel-item.active');
    const nicknameInput = document.getElementById('nicknameInput');
    const imgElement = activeCarousel.querySelector('img');
  
    try {
      const response = await fetch('https://localhost/api/update_ui', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({ imageUrl: imgElement.src, username: nicknameInput.value })
      });
  
      if (!response.ok) {
        console.error('error: an error occurred while updating imageurl and username');
      } else {
        router.navigate('/profile');
      }
    } catch (error) {
      console.error('error:', error);
    }
  });
}