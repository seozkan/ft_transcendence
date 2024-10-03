import { isUserLoggedIn } from './code.js';

class Router {
  constructor(routes) {
    this.routes = routes;
    this._loadInitialRoute();

    window.addEventListener('popstate', () => {
      this._loadInitialRoute();
    });
  }

  _loadInitialRoute() {
    const pathNameSplit = window.location.pathname.split("/");
    const pathSegments = pathNameSplit.length > 1 ? pathNameSplit.slice(1) : [""];
    this.loadRoute(...pathSegments);
  }

  async loadRoute(...urlSegments) {
    const matchedRoute = this._matchUrlToRoute(urlSegments);

    if (!matchedRoute) {
      this.loadRoute('404');
      return;
    }

    if (!isUserLoggedIn() && matchedRoute.path !== '/') {
      console.error('error: user is not logged in');
      this.loadRoute('');
      return;
    }

    const url = `/${urlSegments.join("/")}`;

    history.pushState({}, "", url);

    const routerOutElement = document.querySelector("[data-router]");

    if (!routerOutElement) {
      console.error("error: data-router element not found.");
      return;
    }

    // HTML Load
    const htmlContent = await this._loadHtml(matchedRoute.templateUrl);
    const headerElement = document.querySelector('header');
    const mainElement = document.querySelector('main');

    if (mainElement) {
      mainElement.remove();
    }

    headerElement.insertAdjacentHTML('afterend', htmlContent);

    // CSS Load
    this._loadCss(matchedRoute.styleUrl);
    // JS Load
    this._loadJs(matchedRoute.scriptUrl);
  }

  _matchUrlToRoute(urlSegments) {
    return this.routes.find((route) => {
      const routePathSegments = route.path.split("/").slice(1);

      if (routePathSegments.length !== urlSegments.length) {
        return false;
      }

      return routePathSegments.every((segment, i) => segment === urlSegments[i]);
    });
  }

  async _loadHtml(url) {
    const response = await fetch(url);
    return await response.text();
  }

  _loadCss(url) {
    const existingLink = document.querySelector("link[data-router-css]");
    if (existingLink) {
      existingLink.remove()
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.setAttribute("data-router-css", "true");
    document.head.appendChild(link);
  }

  _loadJs(url) {
    const existingScript = document.querySelector("script[data-router-script]");
    if (existingScript) {
      existingScript.remove()
    }
    const script = document.createElement("script");
    script.src = url;
    script.setAttribute("data-router-script", "true");
    document.body.appendChild(script);
  }
}

const routes = [
  {
    path: "/",
    templateUrl: "/pages/home/index.html",
    styleUrl: "/pages/home/style.css",
    scriptUrl: "/pages/home/script.js",
  },
  {
    path: "/profile",
    templateUrl: "/pages/profile/index.html",
    styleUrl: "/pages/profile/style.css",
    scriptUrl: "/pages/profile/script.js",
  },
  {
    path: "/404",
    templateUrl: "/pages/404/index.html",
    styleUrl: "/pages/404/style.css",
    scriptUrl: "/pages/404/script.js",
  }
];

export { Router, routes };