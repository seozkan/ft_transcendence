"use strict";

import { accessToken, showToastMessage, getUserName } from './code.js';

class Router {
  constructor() {
    this.routes = [];
    this.currentRoute = null;
    this.params = null;
  }

  addRoute(path, component) {
    this.routes.push({ path, component });
  }

  async navigate(location, replace = false) {

    const url = new URL(location, window.location.origin);
    let path = url.pathname;
    this.params = url.searchParams;

    const publicPaths = ['/', '/tfa', '/login', '/register'];


    if (!publicPaths.includes(path)) {
      const header = document.querySelector('header');
      if (header) {
        header.classList.remove('d-none');
      }
    }

    if (!accessToken && !publicPaths.includes(path)) {
      showToastMessage('Bu sayfaya erişim yetkiniz bulunmamaktadır. Lütfen Giriş Yapınız!');
      path = '/';
    }
    else if (accessToken && !publicPaths.includes(path) && path !== '/personalize') {
      const username = await getUserName();
      if (username === null) {
        showToastMessage('Kullanıcı adı seçmelisiniz!');
        path = '/personalize';
      }
    }

    const foundRoute = this.routes.find(route => route.path === path);

    if (foundRoute) {
      this.currentRoute = foundRoute;
      this.loadComponent();
      if (replace) {
        history.replaceState(null, '', path);
      } else {
        history.pushState(null, '', path);
      }
    } else {
      this.navigate('/404');
    }
  }


  async loadComponent() {
    const { component } = this.currentRoute;
    const main = document.querySelector('main');
    const header = document.querySelector('header');

    if (main) {
      main.remove();
    }

    const existingLinks = document.querySelectorAll('link[data-router]');
    existingLinks.forEach(link => link.parentNode.removeChild(link));

    const existingScripts = document.querySelectorAll('script[data-router]');
    existingScripts.forEach(script => script.parentNode.removeChild(script));

    try {
      // HTML
      const response = await fetch(`pages/${component}/${component}.html`);
      const html = await response.text();
      header.insertAdjacentHTML('afterend', html);

      // CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `pages/${component}/${component}.css`;
      link.setAttribute('data-router', 'true');
      document.head.appendChild(link);

      // JavaScript
      const script = document.createElement('script');
      script.type = 'module';
      script.src = `pages/${component}/${component}.js`;
      script.setAttribute('data-router', 'true');
      script.addEventListener('load', () => {
        import(`./pages/${component}/${component}.js`).then(module => {
          if (module.init && typeof module.init === 'function') {
            module.init(this.params);
          }
        });
      });
      document.body.appendChild(script);
    } catch (error) {
      console.error(`Error loading component ${component}:`, error);
    }
  }
}

const router = new Router();

router.addRoute('/', 'home');
router.addRoute('/profile', 'profile');
router.addRoute('/personalize', 'personalize');
router.addRoute('/404', '404');
router.addRoute('/tfa', 'tfa');
router.addRoute('/login', 'login');
router.addRoute('/register', 'register');
router.addRoute('/messages', 'messages');
router.addRoute('/pong', 'pong');
router.addRoute('/leaderboard', 'leaderboard');

router.navigate(window.location, true);

window.addEventListener('popstate', () => {
  const location = window.location;
  router.navigate(location, true);
});

document.body.addEventListener('click', (event) => {
  if (event.target.tagName === 'A' && !event.target.hasAttribute('data-no-router')) {
    event.preventDefault();
    const location = event.target.href;
    router.navigate(location);
  }
});

export default router;
