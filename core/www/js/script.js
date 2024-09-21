async function accessToken() {
    const refreshToken = localStorage.getItem('refresh_token');

    if (!refreshToken) {
        console.error('Refresh token bulunamadı.');
        return null;
    }

    try {
        const response = await fetch('https://localhost/api/token/refresh/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh: refreshToken }),
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);
            console.log('Yeni access token:', data.access);
            console.log('Yeni refresh token:', data.refresh);
            return data.access;
        } else {
            console.error('Token resonce hatası:', data);
            return null;
        }
    } catch (error) {
        console.error('Token yenileme sırasında hata oluştu:', error);
        return null;
    }
}

async function login(username, password) {
    try {
        const response = await fetch('https://localhost/api/token/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                'username': username,
                'password': password,
            }),
        });

        const data = await response.json();

        if (response.ok) {
            const accessToken = data.access;
            const refreshToken = data.refresh;

            localStorage.setItem('access_token', accessToken);
            localStorage.setItem('refresh_token', refreshToken);

            console.log('Access token:', accessToken);
            console.log('Refresh token:', refreshToken);

            return { accessToken, refreshToken };
        } else {
            console.error('Giriş hatası:', data);
            return null;
        }
    } catch (error) {
        console.error('Login işlemi sırasında hata oluştu:', error);
        return null;
    }
}

document.getElementById("test").onclick = async function() {
    try {
        await accessToken();
    } catch (error) {
        console.error("Token alma sırasında hata:", error);
    }
};

login("admin","django") 