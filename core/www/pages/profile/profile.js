"use strict";

import { getUserInfo, accessToken, csrfToken } from '../../code.js';
import router from '../../router.js';

export function init() {
  async function displayUserInfo() {
    const user = await getUserInfo();
    const profileTextName = document.getElementById('profile-text-name');
    const profileTextUserName = document.getElementById('profile-text-username');
    const profileTextEmail = document.getElementById('profile-text-email');
    const profileImage = document.getElementById('profile-image');
    const switchElement = document.getElementById('tfaswitch');
    profileTextName.innerHTML = user.first_name + " " + user.last_name;
    profileTextUserName.innerHTML = user.username;
    profileTextEmail.innerHTML = user.email;
    profileImage.src = user.avatar_url;
    switchElement.checked = user.isTfaActive;
    switchElement.disabled = switchElement.checked;
  }

  //Switch
  const switchElement = document.getElementById('tfaswitch');
  switchElement.addEventListener('change', async function () {
    const bootstrapSwitch = new bootstrap.Modal(document.querySelector('.modal'), {
      keyboard: false,
      backdrop: 'static'
    });
    if (switchElement.checked) {
      bootstrapSwitch.show();
      await fetchQRCode();
    }
  });

  // Modal Buttons & Events
  const tfaInputForm = document.getElementById('tfaInputForm')
  const modal_reject_button = document.getElementById('rejectButton');

  tfaInputForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    const tfaCode = document.getElementById('tfaInput').value
    await verifyTFA(tfaCode);
  })

  modal_reject_button.addEventListener('click', function () {
    if (switchElement.checked)
      switchElement.checked = false;
  });

  // Two Factor Authentication
  async function verifyTFA(tfaCode) {
    if (!accessToken) {
      console.error('Access token is missing or invalid');
      return;
    }

    try {
      const response = await fetch('https://localhost/api/verify_tfa', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({ tfaCode: tfaCode })
      });

      if (!response.ok) {
        if (response.status === 403) {
          console.error('error: (forbidden) you do not have permission to access this resource.');
        } else if (response.status === 400) {
          console.error('error: invalid TOTP code.');
          document.getElementById('tfaInput').classList.add('is-invalid');
        } else if (response.status === 404) {
          console.error('error: user not found.');
        } else {
          console.error('error: network error:', response.status);
        }
      } else {
        switchElement.disabled = true;
        const bootstrapModal = bootstrap.Modal.getInstance(document.querySelector('.modal'));
        bootstrapModal.hide();
      }
    } catch (error) {
      console.error('error:', error);
    }
  }

  // QrCode
  async function fetchQRCode() {
    try {
      const response = await fetch('https://localhost/api/generate_tfa', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('network Error:', response.status);
        return;
      }

      const data = await response.json();
      const base64Image = data.qrCode;
      document.getElementById('qr-code').src = `data:image/png;base64,${base64Image}`;
    } catch (error) {
      console.error('Fetch error:', error);
    }
  }

  document.getElementById('personalizeButton').addEventListener('click', (e) => {
    e.preventDefault();
    router.navigate('/personalize');
  });
  displayUserInfo();
}