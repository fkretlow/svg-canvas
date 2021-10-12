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
        console.log("root mounting child", item);
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
        return element;
    }

    public css(styles: TCSSStylesCollection): CanvasRoot {
        for (let [ property, value ] of Object.entries(styles)) {
            this.element.style.setProperty(property, value);
        }
        return this;
    }

    private setupEventListeners(): void {
        // TODO: Do this properly...
        const mouseEventTypes = [ "click", "mousemove", "mousedown", "mouseup", "click", "dblclick" ];
        mouseEventTypes.forEach(type => {
            this.element.addEventListener(type, (e: MouseEvent) => {
                const handlers = this.eventTargetMixin.getHandlers(type);
                handlers?.forEach(handler => handler(e));
            });
        });
    }
}
