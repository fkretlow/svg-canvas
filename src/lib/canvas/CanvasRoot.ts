import { v4 as uuid } from "uuid";
import { CanvasItem } from "./CanvasItem";
import { createSVGElement } from "./../util";


export class CanvasRoot extends CanvasItem {
    constructor(getItem: TCanvasItemGetter) {
        super(getItem);
        this.element = this.createSVGElement();
        this.setupEventListeners();
    }

    readonly id: TId = uuid();
    readonly parentId = null;
    readonly childIds = null;
    readonly element: SVGElement;
    protected readonly getItem: TCanvasItemGetter;

    destroy() {}
    update() { return this; }
    select() { return this; }
    deselect() { return this; }
    showOverlay() { return this; }
    hideOverlay() { return this; }

    mount(parent: Element): CanvasRoot {
        parent.appendChild(this.element);
        return this;
    }

    unmount(): CanvasRoot {
        this.element.parentElement?.removeChild(this.element);
        return this;
    }

    mountChild(id: TId): CanvasRoot {
        const item = this.getItem(id);
        this.element.appendChild(item.element);
        return this;
    }

    unmountChild(id: TId): CanvasRoot {
        const item = this.getItem(id);
        this.element.removeChild(item.element);
        return this;
    }

    private createSVGElement(): SVGElement {
        const element = createSVGElement("svg") as SVGElement;
        element.setAttribute("draggable", "false");
        element.style.setProperty("contain", "paint");
        return element;
    }

    public css(styles: TCSSStylesCollection): CanvasRoot {
        for (let [ property, value ] of Object.entries(styles)) {
            this.element.style.setProperty(property, value);
        }
        return this;
    }

    private setupEventListeners(): void {
        [ "mousedown", "dblclick" ].forEach(type => {
            this.element.addEventListener(type, (e: MouseEvent) => {
                this.emitEvent(type + ":canvas", { targetId: this.id, domEvent: e });
            });
        });
        [ "mousemove", "mouseup" ].forEach(type => {
            this.element.addEventListener(type, (e: MouseEvent) => {
                this.emitEvent(type, { targetId: this.id, domEvent: e });
            });
        });
    }
}
