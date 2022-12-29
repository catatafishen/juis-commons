import Component, {ComponentCallback} from "../../components/Component.js";


class TextComponent extends Component {
    #text?: string;

    constructor(callback?: ComponentCallback<TextComponent>, tagName: keyof HTMLElementTagNameMap = "span") {
        super(tagName);
        TextComponent.callback(this, callback);
    }

    get text() {
        return this.#text;
    }

    set text(value) {
        this.setInnerText(value || "");
        this.#text = value;
    }

}

const createTextComponent = (text: string, tagName?: keyof HTMLElementTagNameMap) =>
    new TextComponent((t) => t.text = text, tagName);

export {TextComponent as default, createTextComponent};
