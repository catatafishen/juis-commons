import {Navigation, NavigationRequest} from "./Events.js";
import Component from "../components/Component.js";
import Route from "./Route.js";
import {concatenateUrls, isSameUrl} from "./NavigationUtils.js";
import Container from "../components/Container.js";
import Listenable from "../listenable/Listenable.js";

type dynamicImport = (view: string) => Promise<any>;


const getFullUrl = (request: NavigationRequest) => {
    if (!request.url.startsWith("/")) {
        if (document.location.pathname.endsWith("/")) {
            return document.location.pathname + request.url;
        } else {
            return document.location.pathname + "/" + request.url;
        }
    }
    return request.url;
};

class Router extends Listenable {
    readonly #routes: Route[] = [];
    #currentComponent: Component;
    #currentRoute: Route | null = null;
    #currentUrl: string | null = null;
    #routerBaseUrl = "";
    viewsPath = "./";
    readonly #loadingPage: Component;
    readonly #notFoundPage: Component;
    readonly #errorPage: Component;
    readonly #dynamicImport: (view: string) => Promise<any>;


    constructor(dynamicImport: dynamicImport, loadingPage: Component, notFoundPage: Component, errorPage: Component) {
        super();
        this.#showComponent(loadingPage);
        this.#currentComponent = loadingPage;
        this.#loadingPage = loadingPage;
        this.#notFoundPage = notFoundPage;
        this.#errorPage = errorPage;
        this.#dynamicImport = dynamicImport;
    };

    #requestedUrlNotFound = (requestedUrl: string, request: NavigationRequest) => {
        if (requestedUrl.startsWith(this.#routerBaseUrl)) {
            this.#showComponent(this.#notFoundPage);
            return;
        }
        return this.trigger(new NavigationRequest(request.url, request.replaceHistory, {skipOrigin: true}));
    };

    #changeUrl = (fullUrl: string, replaceHistory = false) => {
        if (replaceHistory) {
            history.replaceState(null, "", fullUrl);
        } else {
            history.pushState(null, "", fullUrl);
        }
    };

    #consumeUrl = (fullUrl: string, route: Route) => {
        let matchingUrlPart = route.consumeUrl(fullUrl.substring(this.#routerBaseUrl.length));
        let consumedUrl = concatenateUrls(this.#routerBaseUrl, matchingUrlPart);
        return {matchingUrlPart, consumedUrl};
    };

    #triggerNavigationInComponent = (route: Route, component: Component, url: string, matchingUrlPart: string, consumedUrl: string) => {
        const parameters = route.getParameters(matchingUrlPart);
        component.trigger(new Navigation(url, consumedUrl, parameters));
    };

    readonly #requestNavigateListener = this.on(NavigationRequest, (request: NavigationRequest) => {
        let fullUrl = getFullUrl(request);
        let route = this.#findMatchingRoute(fullUrl);
        if (!route) {
            return this.#requestedUrlNotFound(fullUrl, request);
        }
        this.#changeUrl(fullUrl, request.replaceHistory);
        this.#navigate(route, fullUrl);
    });

    readonly navigateListener = this.on(Navigation, (navigation: Navigation) => {
        let route = this.#findMatchingRoute(navigation.url);
        if (route) {
            this.#navigate(route, navigation.url);
        } else {
            this.#currentRoute = null;
            console.warn("could not find route", navigation.url, "among routes", this.#routes.map(route => route.toString()));
            this.#showComponent(this.#notFoundPage);
        }
    });

    #replaceCurrentRoute = (route: Route) => {
        if (this.#currentRoute?.cacheComponents === false) {
            this.#currentComponent.destroy();
            this.#currentUrl = null;
        }
        this.#currentRoute = route;
    };

    #navigate = (route: Route, requestedUrl: string) => {
        let {matchingUrlPart, consumedUrl} = this.#consumeUrl(requestedUrl, route);

        if (this.#currentUrl && isSameUrl(this.#currentUrl, consumedUrl)) {
            // No need to act if the url didn't change. Just propagate in case something on a lower level has changed.
            this.#triggerNavigationInComponent(route, this.#currentComponent, requestedUrl, consumedUrl, matchingUrlPart);
            return;
        }
        this.#replaceCurrentRoute(route);
        this.#showComponent(this.#loadingPage);
        route.getComponent(consumedUrl, this.#dynamicImport, this.viewsPath).then(component => {
            if (route !== this.#currentRoute) {
                // If the route already changed while loading. Then do nothing.
                return;
            }
            this.#triggerNavigationInComponent(route, component, requestedUrl, consumedUrl, matchingUrlPart);
            this.#showComponent(component);
            this.#currentUrl = consumedUrl;
        }).catch(e => {
            this.#showComponent(this.#errorPage);
            console.error(e);
        });
    };

    #showComponent = (newComponent: Component) => {
        if (this.#currentComponent && this.#currentComponent !== newComponent) {
            this.#currentComponent.getOuterElement().replaceWith(newComponent.getOuterElement());
            window.scrollTo(0, 0);
            this.#currentComponent = newComponent;
            if (newComponent instanceof Container) {
                newComponent.autoAppend();
            }
            newComponent.nextListenable = this;
        }
    };

    #findMatchingRoute = (url: string) => {
        if (url.startsWith(this.#routerBaseUrl)) {
            const possibleRouteUrl = url.substring(this.#routerBaseUrl.length);
            return this.#routes.find(route => route.isMatchingUrl(possibleRouteUrl));
        }
    };

    addRoute = (route: Route) => this.#routes.push(route);
    getCurrentComponent = () => this.#currentComponent;
    getElement = () => this.#currentComponent?.getElement();
    getOuterElement = () => this.#currentComponent?.getOuterElement();
    destroy = () => {
        this.removeAllListeners();
        this.#currentComponent?.destroy();
    };
}

export {Router as default, dynamicImport};
