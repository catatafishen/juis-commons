import {createTextComponent} from "../../templates/text-component/TextComponent.js";

const tableTextCellFactory = (value: string) => {
    return createTextComponent(value, "td");
};
const tableNumberCellFactory = (value: number) => {
    let component = createTextComponent(value.toString(10), "td");
    component.setStyle("textAlign", "right");
    return component;
};

export {tableTextCellFactory, tableNumberCellFactory};
