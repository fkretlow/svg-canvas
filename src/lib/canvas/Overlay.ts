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
        this.createHandles();
    }

    public update(target: IRectangle): Overlay {
        this.rectElement.setAttribute("x", `${target.x}px`);
        this.rectElement.setAttribute("y", `${target.y}px`);
        this.rectElement.setAttribute("width", `${target.width}px`);
        this.rectElement.setAttribute("height", `${target.height}px`);

        ResizeOverlay.anchors.forEach(anchor => {
            const handle = this.handles.get(anchor);
            const x = isWest(anchor) ? target.x : target.x + target.width;
            const y = isNorth(anchor) ? target.y : target.y + target.height;
            handle.setAttribute("cx", `${x}px`);
            handle.setAttribute("cy", `${y}px`);
        })

        return this;
    }

    static readonly anchors: TOverlayHandleAnchor[] = [ "nw", "ne", "se", "sw" ];
    private handles = new Map<TOverlayHandleAnchor, SVGCircleElement>();

    private createHandles(): void {
        ResizeOverlay.anchors.forEach(anchor => {
            const handle = createSVGElement("circle") as SVGCircleElement;
            handle.setAttribute("fill", "white");
            handle.setAttribute("stroke", "#007acc");
            handle.setAttribute("stroke-width", "1.5px");
            handle.setAttribute("r", "5px");
            const cursor = anchor === "nw" || anchor === "se" ? "nwse-resize" : "nesw-resize";
            handle.style.setProperty("cursor", cursor);
            handle.addEventListener("mousedown", (e: MouseEvent) => {
                this.emitEvent("mousedown:resize-handle", { anchor, domEvent: e });
            });
            this.groupElement.appendChild(handle);
            this.handles.set(anchor, handle);
        });
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
}


export function isNorth(anchor: TOverlayHandleAnchor): boolean { return anchor.startsWith("n"); }
export function isEast(anchor: TOverlayHandleAnchor): boolean { return anchor.endsWith("e"); }
export function isSouth(anchor: TOverlayHandleAnchor): boolean { return anchor.startsWith("s"); }
export function isWest(anchor: TOverlayHandleAnchor): boolean { return anchor.endsWith("w"); }
