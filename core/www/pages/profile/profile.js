"use strict";

import { getUserInfo, getCookie, showToastMessage, router } from '../../code.js';

export async function init(params) {
  let isFriend;
  let isReq;
  let isBlocked;

  const username = params.get('username');
  const buttonGroup = document.getElementById("buttonGroup");
  const blockUserButton = document.getElementById('blockUserButton');
  if (!username) {
    buttonGroup.classList.add('d-none');
  }

  async function displayUserInfo(username) {
    const { blockers, blockeds } = await getBlockedUsers();

    blockeds.forEach(user => {
      if (username === user.blocker) {
        buttonGroup.innerHTML = '<p class="text-center">Bu kullanıcı sizi engellediğinden profil sayfasını görüntüleyemezsiniz.</p>';
        showToastMessage('Bu kullanıcı sizi engelledi.');
        return;
      }
    });

    blockers.forEach(user => {
      if (username == user.blocked) {
        isBlocked = true;
        blockUserButton.innerHTML = '<i class="fa-solid fa-ban ms-1"></i> Engeli Kaldır';
      }
    });

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
    if (isBlocked) {
      showToastMessage('Engellenmiş bir kullanıcı arkadaş olarak eklenemez!');
    }
    else if (isFriend) {
      bootstrapFriendModal.show();
    }
    else {
      await sendFriendRequest();
    }
  })

  async function sendFriendRequest() {
    const friendUsername = document.querySelector('#profile-text-username').innerText;
    const accessToken = getCookie('access_token');
    const csrfToken = getCookie('csrftoken');

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
          const data = await response.json();
          console.error('error:', data);
        }
        return;
      } else {
        console.log('friend request send successfully');
        addFriendButton.innerHTML = '<i class="fa-solid fa-user-group"></i>Arkadaşlık İsteği Gönderildi';
      }
    } catch (error) {
      console.error('error:', error);
    }
  }

  async function checkIfFriend() {
    const friendUsername = document.querySelector('#profile-text-username').innerText;
    const accessToken = getCookie('access_token');
    const csrfToken = getCookie('csrftoken');

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

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          console.error('error: user not found.');
        } else {
          console.error('error:', data);
        }
        return;
      } else {
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

  async function removeFriend() {
    const accessToken = getCookie('access_token');
    const csrfToken = getCookie('csrftoken');

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

      const data = await response.json();

      if (!response.ok) {
        console.error('error:', data);
        return;
      }

      if (data.success) {
        console.log(data.success);
        bootstrap.Modal.getInstance(document.getElementById('friendModal')).hide();
        checkIfFriend();
      } else {
        console.error('error:', data);
      }
    } catch (error) {
      console.error('error:', error);
    }
  }

  //Remove Friend
  document.getElementById('friendRemoveButton').addEventListener('click', async () => {
    await removeFriend();
  });

  // Two Factor Authentication
  async function verifyTFA(tfaCode) {
    const accessToken = getCookie('access_token');
    const csrfToken = getCookie('csrftoken');

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
        return;
      } else {
        const switchElement = document.getElementById('tfaswitch');
        switchElement.disabled = true;
        const bootstrapSwitchModal = bootstrap.Modal.getInstance(document.getElementById('tfaModal'));
        bootstrapSwitchModal.hide();
      }
    } catch (error) {
      console.error('error:', error);
    }
  }

  // Block User

  async function blockUser() {
    const accessToken = getCookie('access_token');
    const csrfToken = getCookie('csrftoken');

    try {
      const response = await fetch('https://localhost/api/block_user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({ username: username })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('error:', data);
        return;
      }

      if (data.success) {
        blockUserButton.innerHTML = '<i class="fa-solid fa-ban ms-1"></i> Engeli Kaldır';
        isBlocked = true;
        await removeFriend();
        isFriend = false;
        showToastMessage('Kullanıcı engellendi.');
      } else {
        console.error('Error:', data.error);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  // Unblock User
  async function unblockUser() {
    const accessToken = getCookie('access_token');
    const csrfToken = getCookie('csrftoken');

    try {
      const response = await fetch('https://localhost/api/unblock_user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({ username: username })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('error:', data);
        return;
      }

      if (data.success) {
        blockUserButton.innerHTML = '<i class="fa-solid fa-ban ms-1"></i> Engelle';
        isBlocked = false;
        showToastMessage('Kullanıcının engeli kaldırıldı.');
      } else {
        console.error('error:', data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  blockUserButton.addEventListener('click', async () => {
    if (isBlocked) {
      await unblockUser();
    } else {
      await blockUser();
    }
  });

  async function getBlockedUsers() {
    const accessToken = getCookie('access_token');
    const csrfToken = getCookie('csrftoken');

    try {
      const response = await fetch('https://localhost/api/get_blocked_users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        }
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('error:', data);
        return;
      }

      return { blockeds: data.blockeds, blockers: data.blockers }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  // Send Message
  document.getElementById('sendMessageButton').addEventListener('click', () => {
    if (isFriend)
      router.navigate('/messages');
    else
      showToastMessage('Arkadaşınız olmayan bir kullanıcıya mesaj gönderemezsiniz!');
  });

  await displayUserInfo(username);
  await checkIfFriend();
}