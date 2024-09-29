function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

const accessToken = getCookie('access_token');
const refreshToken = getCookie('refresh_token');

async function getUserInfo() {
  const accessToken = getCookie('access_token');
  const refreshToken = getCookie('refresh_token');

  try {
      const response = await fetch('https://localhost/api/user', {
          method: 'GET',
          headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
          }
      });

      if (!response.ok) {
          throw new Error('Ağ hatası: ' + response.status);
      }

      const data = await response.json();
      displayUserInfo(data);
  } catch (error) {
      console.error('Hata:', error);
  }
}

function displayUserInfo(user) {
  const userInfoDiv = document.getElementById('user-info');
  userInfoDiv.innerHTML = `
      <p>Kullanıcı Adı: ${user.username}</p>
      <p>Email: ${user.email}</p>
      <p>İsim: ${user.first_name}</p>
      <p>Soyisim: ${user.last_name}</p>
  `;
}

document.getElementById("thirdbutton").onclick = async () => {
  const response = await fetch('https://localhost/accounts/logout', {
      method: 'GET',
  });
  const data = await response.json();
  const userInfoDiv = document.getElementById('user-info');
  userInfoDiv.innerHTML = `
      <p>${data}</p>
  `;
};

getUserInfo();