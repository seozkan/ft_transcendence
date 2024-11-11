"use strict";

import { getUserInfo, accessToken, csrfToken, showToastMessage } from '../../code.js';
import router from '../../router.js';

export async function init(params) {
  const username = params.get('username');
  async function displayUserInfo(username) {

    const user = await getUserInfo(username);
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
    const bootstrapSwitchModal = new bootstrap.Modal(document.getElementById('tfaModal'), {
      keyboard: false,
      backdrop: 'static'
    });
    if (switchElement.checked) {
      const bootstrapSettingsModal = bootstrap.Modal.getInstance(document.getElementById('settings'));
      bootstrapSettingsModal.hide();
      bootstrapSwitchModal.show();
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

  //AddFriend
  const addFriendButton = document.getElementById('addFriendButton');
  const bootstrapFriendModal = new bootstrap.Modal(document.getElementById('friendModal'));

  addFriendButton.addEventListener('click', async () => {
    if (isFriend) {
      bootstrapFriendModal.show();
    }
    else {
      await sendFriendRequest();
    }
  })

  async function sendFriendRequest() {
    const friendUsername = document.querySelector('#profile-text-username').innerText;

    try {
      const response = await fetch('https://localhost/api/send_friend_request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({ username: friendUsername })
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.error('error: user not found.');
        } else if (response.status == 400) {
          showToastMessage('Kendinizi arkadaş olarak ekleyemezsiniz!');
        } else {
          const errorData = await response.json();
          console.error('error:', errorData.error);
        }
      } else {
        console.log('Friend request send successfully');
        addFriendButton.innerHTML = '<i class="fa-solid fa-user-group"></i>Arkadaşlık İsteği Gönderildi';
      }
    } catch (error) {
      console.error('error:', error);
    }
  }

  //isFriend
  let isFriend;
  let isReq;

  async function checkIfFriend() {
    const friendUsername = document.querySelector('#profile-text-username').innerText;

    try {
      const response = await fetch('https://localhost/api/is_friend', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({ username: friendUsername })
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.error('error: user not found.');
        } else {
          const errorData = await response.json();
          console.error('error:', errorData.error);
        }
      } else {
        const data = await response.json();
        isFriend = data.isFriend;
        isReq = data.isReq;
        if (isReq) {
          addFriendButton.innerHTML = '<i class="fa-solid fa-user-group ms-1"></i> Arkadaşlık İsteği Gönderildi';
        }
        else if (isFriend) {
          addFriendButton.innerHTML = '<i class="fa-solid fa-user-group ms-1"></i> Arkadaşlıktan Çıkar';
          isFriend = true;
        }
        else {
          addFriendButton.innerHTML = '<i class="fa-solid fa-user-group ms-1"></i> Arkadaş Ekle';
        }
      }
    } catch (error) {
      console.error('error:', error);
    }
  }

  //Remove Friend

  document.getElementById('friendRemoveButton').addEventListener('click', async () => {
    try {
      const response = await fetch('https://localhost/api/remove_friend', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({ username: username })
      });

      if (!response.ok) {
        console.error('Network error:', response.status);
        return;
      }

      const data = await response.json();

      if (data.success) {
        console.log(data.success);
        bootstrap.Modal.getInstance(document.getElementById('friendModal')).hide();
        checkIfFriend();
      } else {
        console.error('Error:', data.error);
      }
    } catch (error) {
      console.error('Error:', error);
    }
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
        const bootstrapSwitchModal = bootstrap.Modal.getInstance(document.getElementById('tfaModal'));
        bootstrapSwitchModal.hide();
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

  await displayUserInfo(username);
  await checkIfFriend();
}