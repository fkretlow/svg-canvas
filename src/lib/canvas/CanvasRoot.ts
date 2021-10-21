import { v4 as uuid } from "uuid";
import { CanvasItem } from "./CanvasItem";
import { EventTargetMixin } from "./../events";
import { createSVGElement, transformWindowToSVGCoordinates } from "./../util";
import { MarqueeOverlay } from "./Overlay";


export class CanvasRoot extends CanvasItem implements IEventTarget {
    constructor(getItem: TCanvasItemGetter) {
        super(getItem);
        this.element = this.createSVGElement();
        this.laneGroupElement = this.createLaneGroupElement();
        this.element.appendChild(this.laneGroupElement);
        this.itemGroupElement = this.createItemGroupElement();
        this.element.appendChild(this.itemGroupElement);
        this.overlayGroupElement = this.createOverlayGroupElement();
        this.element.appendChild(this.overlayGroupElement);
    }

    readonly id: TId = uuid();
    readonly parentId = null;
    readonly childIds = null;
    readonly element: SVGElement;
    readonly itemGroupElement: SVGGElement;
    readonly laneGroupElement: SVGGElement;
    readonly overlayGroupElement: SVGGElement;
    readonly marquee = new MarqueeOverlay();
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

    mountLane(lane: ICanvasItem): CanvasRoot {
        this.laneGroupElement.appendChild(lane.element);
        return this;
    }

    mountChild(id: TId): CanvasRoot {
        const child = this.getItem(id);
        this.itemGroupElement.appendChild(child.element);
        return this;
    }

    unmountChild(id: TId): CanvasRoot {
        const item = this.getItem(id);
        this.itemGroupElement.removeChild(item.element);
        return this;
    }

    public showMarquee(): CanvasRoot {
        this.marquee.mount(this.overlayGroupElement);
        return this;
    }

    public hideMarquee(): CanvasRoot {
        this.marquee.resetVector();
        this.marquee.unmount();
        return this;
    }

    public setMarqueeOrigin(origin: IPoint): CanvasRoot {
        this.marquee.resetVector();
        this.marquee.setOrigin(origin);
        return this;
    }

    public resizeMarqueeBy(delta: IPoint): CanvasRoot {
        this.marquee.moveVectorBy(delta);
        return this;
    }

    private createSVGElement(): SVGElement {
        const element = createSVGElement("svg") as SVGElement;
        element.setAttribute("draggable", "false");

        [ "mouseup", "mousemove", "mousedown", "click", "dblclick" ].forEach(type => {
            element.addEventListener(type, (e: MouseEvent) => {
                if (e["canvasEventDetail"] === undefined) e["canvasEventDetail"] = {
                    eventType: type,
                };
                Object.assign(e["canvasEventDetail"], {
                    canvasCoordinates: transformWindowToSVGCoordinates(this.element, e, false),
                    clientCoordinates: { x: e.clientX, y: e.clientY },
                    movement: { x: e.movementX, y: e.movementY },
                    shiftKey: e.shiftKey,
                    altKey: e.altKey,
                    ctrlKey: e.ctrlKey,
                    button: e.button,
                });
                this.emitEvent(e["canvasEventDetail"]["eventType"], e["canvasEventDetail"]);
            });
        });

        return element;
    }

    private createLaneGroupElement(): SVGGElement {
        const g = createSVGElement("g") as SVGGElement;
        return g;
    }

    private createItemGroupElement(): SVGGElement {
        const g = createSVGElement("g") as SVGGElement;
        return g;
    }

    private createOverlayGroupElement(): SVGGElement {
        const g = createSVGElement("g") as SVGGElement;
        return g;
    }

    public css(styles: TCSSStylesCollection): CanvasRoot {
        for (let [ property, value ] of Object.entries(styles)) {
            this.element.style.setProperty(property, value);
        }
        return this;
    }

    /*
     * Internal Event Handling
     */
    protected eventTargetMixin = new EventTargetMixin();
    protected async emitEvent(type: TEventType, detail?: TEventDetail): Promise<void> {
        return this.eventTargetMixin.emitEvent(type, detail);
    }
    public on(type: string, handler: TMouseEventHandler): CanvasItem {
        this.eventTargetMixin.on(type, handler);
        return this;
    }
    public off(type: string, handler?: Function): CanvasItem {
        this.eventTargetMixin.off(type, handler);
        return this;
    }
}
