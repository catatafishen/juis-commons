import Component from "./Component.js";
import Router from "../router/Router.js";
import {removeByValue} from "../JuisUtils.js";
import {Navigation} from "../router/Events.js";


class Container extends Component {
    readonly #children: (Component | Router)[] = [];
    #navigationEvent?: Navigation;

    constructor(tagName?: keyof HTMLElementTagNameMap | Element, ...cssClasses: string[]) {
        super(tagName, ...cssClasses);
        Object.values(this)
            .filter(member => member instanceof Component)
            .forEach(component => this.appendChild(component));
        this.on(Navigation, event => {
            this.#navigationEvent = event;
            this.#children.forEach(this.#triggerNavigate);
        });
    };

    appendChild = <T extends Component | Router>(child: T) => {
        this.getElement().append(child.getOuterElement());
        return this.#handleNewChild(child);
    };

    insertBefore = <T extends Component | Router>(child: T, existingChild?: T) => {
        if (existingChild) {
            this.getElement().insertBefore(child.getOuterElement(), existingChild.getOuterElement());
        } else {
            this.getElement().insertBefore(child.getOuterElement(), this.getElement().firstChild);
        }
        return this.#handleNewChild(child);
    };

    replaceChild = <T1 extends Component | Router, T2 extends Component | Router>(newChild: T1, oldChild: T2) => {
        this.getElement().replaceChild(newChild.getOuterElement(), oldChild.getOuterElement());
        removeByValue(this.#children, oldChild);
        this.#handleNewChild(newChild);
    };

    #handleNewChild = <T extends Component | Router>(child: T) => {
        this.#children.push(child);
        this.#triggerNavigate(child);
        if (child instanceof Container) {
            child.autoAppend();
        }
        if (child instanceof Router && child.getCurrentComponent() instanceof Container) {
            const currentComponent = child.getCurrentComponent();
            if (currentComponent instanceof Container) {
                currentComponent.autoAppend();
            }
        }
        child.nextListenable = this;
        return child;
    };

    autoAppend = () => {
        Object.entries(this)
            .filter(entry => entry[1] instanceof Component)
            .filter(entry => !entry[1].getElement().parentNode)
            .forEach(entry => {
                let [key, component] = entry;
                this.appendChild(component);
                component.addCssClass(key);
            });
    };

    #triggerNavigate = (child: Component | Router) => {
        if (this.#navigationEvent && (child instanceof Container || child instanceof Router)) {
            child.trigger(new Navigation(this.#navigationEvent.url, this.#navigationEvent.consumedUrl, this.#navigationEvent.parameters));
        }
    };
}

export {Container as default};
