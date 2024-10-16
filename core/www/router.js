"use strict";

import { accessToken, showToastMessage} from './code.js'; 

class Router {
  constructor() {
    this.routes = [];
    this.currentRoute = null;
  }

  addRoute(path, component) {
    this.routes.push({ path, component });
  }

  navigate(path, replace = false) {
    if (!accessToken && path !== '/') {
      showToastMessage('Bu sayfaya erişim yetkiniz bulunmamaktadır. Lütfen Giriş Yapınız!');
      path = '/';
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

    if (main){
      main.remove();
    }

    const existingLinks = document.querySelectorAll('link[data-router]');
    existingLinks.forEach(link => link.parentNode.removeChild(link));

    const existingScripts = document.querySelectorAll('script[data-router]');
    existingScripts.forEach(script => script.parentNode.removeChild(script));

    try {
      const response = await fetch(`pages/${component}/${component}.html`);
      const html = await response.text();
      header.insertAdjacentHTML('afterend', html);

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `pages/${component}/${component}.css`;
      link.setAttribute('data-router', 'true');
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.type = 'module';
      script.src = `pages/${component}/${component}.js`;
      script.setAttribute('data-router', 'true');
      script.addEventListener('load', () => {
        import(`./pages/${component}/${component}.js`).then(module => {
          if (module.init && typeof module.init === 'function') {
            module.init();
          }
        });
      });
      document.body.appendChild(script);
    } catch (error) {
      console.error(`error loading component ${component}:`, error);
    }
  }
}

const router = new Router();

router.addRoute('/', 'home');
router.addRoute('/profile', 'profile');
router.addRoute('/personalize', 'personalize');
router.addRoute('/404', '404');
router.addRoute('/tfa', 'tfa');

router.navigate(window.location.pathname, true);

window.addEventListener('popstate', () => {
  const currentPath = window.location.pathname;
  router.navigate(currentPath, true);
});

document.body.addEventListener('click', (event) => {
  if (event.target.tagName === 'A' && !event.target.hasAttribute('data-no-router')) {
    event.preventDefault();
    const path = event.target.getAttribute('href');
    console.log(`Link clicked: navigating to ${path}`);
    router.navigate(path);
  }
});

export default router;