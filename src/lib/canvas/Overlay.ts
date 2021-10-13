import { createSVGElement } from "./../util";
import { EventTargetMixin } from "./../events";


export class Overlay {
    constructor() {
        this.groupElement = this.createGroupElement();
        this.rectElement = this.createRectElement();
        this.groupElement.appendChild(this.rectElement);
    }

    protected _isMounted: boolean = false;
    public get isMounted(): boolean { return this._isMounted; }
    protected set isMounted(b: boolean) { this._isMounted = b; }

    public get element(): SVGGElement {
        return this.groupElement;
    }

    public mount(parent: SVGElement): Overlay {
        if (!this.isMounted) {
            parent.insertAdjacentElement("beforeend", this.element);
            this.isMounted = true;
        }
        return this;
    }

    public unmount(): Overlay {
        if (this.isMounted) {
            this.element.parentElement?.removeChild(this.element);
            this.isMounted = false;
        }
        return this;
    }

    public update(target: IRectangle): Overlay {
        this.rectElement.setAttribute("x", `${target.x}px`);
        this.rectElement.setAttribute("y", `${target.y}px`);
        this.rectElement.setAttribute("width", `${target.width}px`);
        this.rectElement.setAttribute("height", `${target.height}px`);
        return this;
    }

    protected rectElement: SVGRectElement;
    protected groupElement: SVGGElement;

    protected createRectElement(): SVGRectElement {
        const rect = createSVGElement("rect") as SVGRectElement;
        rect.setAttribute("fill", "none");
        rect.setAttribute("stroke", "#007acc");
        rect.setAttribute("stroke-width", "2px");
        return rect;
    }

    protected createGroupElement(): SVGGElement {
        return createSVGElement("g") as SVGGElement;
    }
}


export class ResizeOverlay extends Overlay {
    constructor() {
        super();
        this.handleNW = this.createHandle("nw");
        this.handleNE = this.createHandle("ne");
        this.handleSE = this.createHandle("se");
        this.handleSW = this.createHandle("sw");
        this.groupElement.appendChild(this.handleNW);
        this.groupElement.appendChild(this.handleNE);
        this.groupElement.appendChild(this.handleSE);
        this.groupElement.appendChild(this.handleSW);
        this.setupEventListeners();
    }

    public update(target: IRectangle): Overlay {
        this.rectElement.setAttribute("x", `${target.x}px`);
        this.rectElement.setAttribute("y", `${target.y}px`);
        this.rectElement.setAttribute("width", `${target.width}px`);
        this.rectElement.setAttribute("height", `${target.height}px`);

        this.handleNW.setAttribute("cx", `${target.x}px`);
        this.handleNW.setAttribute("cy", `${target.y}px`);
        this.handleNE.setAttribute("cx", `${target.x+target.width}px`);
        this.handleNE.setAttribute("cy", `${target.y}px`);
        this.handleSE.setAttribute("cx", `${target.x+target.width}px`);
        this.handleSE.setAttribute("cy", `${target.y+target.height}px`);
        this.handleSW.setAttribute("cx", `${target.x}px`);
        this.handleSW.setAttribute("cy", `${target.y+target.height}px`);
        return this;
    }

    private handleNW: SVGCircleElement;
    private handleNE: SVGCircleElement;
    private handleSE: SVGCircleElement;
    private handleSW: SVGCircleElement;

    private createHandle(anchor: "nw" | "ne" | "se" | "sw"): SVGCircleElement {
        const circle = createSVGElement("circle") as SVGCircleElement;
        circle.setAttribute("fill", "white");
        circle.setAttribute("stroke", "#007acc");
        circle.setAttribute("stroke-width", "1px");
        circle.setAttribute("r", "5px");
        const cursor = anchor === "nw" || anchor === "se" ? "nwse-resize" : "nesw-resize";
        circle.style.setProperty("cursor", cursor);
        return circle;
    }

    private eventTargetMixin = new EventTargetMixin();
    protected async emitEvent(type: TEventType, detail?: TEventDetail): Promise<void> {
        return this.eventTargetMixin.emitEvent(type, detail);
    }
    public on(type: string, handler: TMouseEventHandler): ResizeOverlay {
        this.eventTargetMixin.on(type, handler);
        return this;
    }
    public off(type: string, handler?: Function): ResizeOverlay {
        this.eventTargetMixin.off(type, handler);
        return this;
    }

    private setupEventListeners(): void {
        this.handleNW.addEventListener("mousedown", (e: MouseEvent) => {
            this.emitEvent("mousedown", { targetType: "overlay-handle", anchor: "nw", domEvent: e });
        });
        this.handleNE.addEventListener("mousedown", (e: MouseEvent) => {
            this.emitEvent("mousedown", { targetType: "overlay-handle", anchor: "ne", domEvent: e });
        });
        this.handleSE.addEventListener("mousedown", (e: MouseEvent) => {
            this.emitEvent("mousedown", { targetType: "overlay-handle", anchor: "se", domEvent: e });
        });
        this.handleSW.addEventListener("mousedown", (e: MouseEvent) => {
            this.emitEvent("mousedown", { targetType: "overlay-handle", anchor: "sw", domEvent: e });
        });
    }
}
