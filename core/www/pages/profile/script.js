function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

async function getUserInfo() {
  const accessToken = getCookie('access_token');

  if (accessToken) {
    document.getElementById("offcanvasButton").classList.remove("d-none")
    console.log("yes")
  }

  try {
      const response = await fetch('https://localhost/api/user', {
          method: 'GET',
          headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
          }
      });

      if (!response.ok) {
        console.error('network Error:', response.status)
      }

      const data = await response.json();
      displayUserInfo(data);
  } catch (error) {
      console.error('error:', error);
  }
}

function displayUserInfo(user) {
  const profileTextName = document.getElementById('profile-text-name');
  const profileTextUserName = document.getElementById('profile-text-username');
  const profileTextEmail = document.getElementById('profile-text-email');
  const profileImage= document.getElementById('profile-image');
  profileTextName.innerHTML = user.first_name + " " + user.last_name;
  profileTextUserName.innerHTML = user.username;
  profileTextEmail.innerHTML = user.email;
  profileImage.src = user.image_url;
}

getUserInfo();