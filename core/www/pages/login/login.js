import { csrfToken, showToastMessage } from '../../code.js';

export function init() {
    const loginForm = document.getElementById('loginForm');

    const loginEmailInput = document.getElementById('loginEmailInput');
    const loginPassInput = document.getElementById('loginPassInput');

    const InvalidEmail = document.getElementById('InvalidEmail');
    const InvalidPass = document.getElementById('InvalidPass');


    function checkEmail() {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regex.test(loginEmailInput.value) || loginEmailInput.value.length > 50) {
            loginEmailInput.classList.remove('is-valid');
            loginEmailInput.classList.add('is-invalid');
            InvalidEmail.innerHTML = 'E-posta adresinizi kontrol ediniz!';
            return false;
        } else {
            loginEmailInput.classList.remove('is-invalid');
            loginEmailInput.classList.add('is-valid');
            InvalidEmail.innerHTML = '';
            return true;
        }
    }

    function checkPass() {
        const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]{8,}$/;
        if (!regex.test(loginPassInput.value) || loginPassInput.value.length > 20) {
            loginPassInput.classList.remove('is-valid');
            loginPassInput.classList.add('is-invalid');
            InvalidPass.innerHTML = 'Şifre formatı doğru değil!';
            return false;
        } else {
            loginPassInput.classList.remove('is-invalid');
            loginPassInput.classList.add('is-valid');
            InvalidPass.innerHTML = '';
            return true;
        }
    }

    async function user_login() {
        const url = 'https://localhost/accounts/user_login';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({ email: loginEmailInput.value, password: loginPassInput.value })
        });

        if (response.redirected) {
            window.location.href = response.url;
        } else if (response.status == 400) {
            showToastMessage('Email adresiniz veya parolanız hatalı!')
        }
        else {
            const errorData = await response.json();
            console.error('Error:', errorData.error);
        }
    }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (loginForm.checkValidity() && checkEmail() && checkPass()) {
            await user_login();
        }
    });
}

