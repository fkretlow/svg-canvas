import { createSVGElement } from "./../util";


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
        if (this.options.stroke !== undefined) rect.setAttribute("stroke", this.options.stroke);
        if (this.options.strokeWidth !== undefined )rect.setAttribute("stroke-width", `${this.options.strokeWidth}px`);
        if (this.options.fill !== undefined) rect.setAttribute("fill", this.options.fill);
        if (this.options.fillOpacity !== undefined) rect.setAttribute("fill-opacity", `${this.options.fillOpacity}`);
        if (this.options.strokeOpacity !== undefined) rect.setAttribute("stroke-opacity", `${this.options.strokeOpacity}`);
        return rect;
    }

    protected createGroupElement(): SVGGElement {
        return createSVGElement("g") as SVGGElement;
    }

    protected options: Partial<ICanvasOverlayOptions> = {
        stroke: "#007acc",
        strokeWidth: 1,
        fill: "none",
    };

    public setOptions(options: Partial<ICanvasOverlayOptions>): Overlay {
        Object.assign(this.options, options);
        if (options.stroke !== undefined) this.rectElement.setAttribute("stroke", options.stroke);
        if (options.fill !== undefined) this.rectElement.setAttribute("fill", options.fill);
        if (options.strokeWidth !== undefined) this.rectElement.setAttribute("stroke-width", `${options.strokeWidth}px`);
        if (options.fillOpacity !== undefined) this.rectElement.setAttribute("fill-opacity", `${options.fillOpacity}`);
        if (options.strokeOpacity !== undefined) this.rectElement.setAttribute("stroke-opacity", `${options.strokeOpacity}`);
        return this;
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

    static readonly anchors: TCanvasOverlayHandleAnchor[] = [ "nw", "ne", "se", "sw" ];
    private handles = new Map<TCanvasOverlayHandleAnchor, SVGCircleElement>();

    private createHandles(): void {
        ResizeOverlay.anchors.forEach(anchor => {
            const handle = createSVGElement("circle") as SVGCircleElement;
            handle.setAttribute("fill", "white");
            handle.setAttribute("stroke", "#007acc");
            handle.setAttribute("stroke-width", "1.5px");
            handle.setAttribute("r", "4px");
            const cursor = anchor === "nw" || anchor === "se" ? "nwse-resize" : "nesw-resize";
            handle.style.setProperty("cursor", cursor);
            this.groupElement.appendChild(handle);
            this.handles.set(anchor, handle);

            handle.addEventListener("mousedown", (e: MouseEvent) => {
                e["canvasEventDetail"] = {
                    eventType: "mousedown:resize-handle",
                    anchor,
                };
            });
        });
    }

    protected options: Partial<ICanvasOverlayOptions> = {
        stroke: "#007acc",
        showHandles: false,
        strokeWidth: 1,
    };

    public setOptions(options: Partial<ICanvasOverlayOptions>): Overlay {
        Object.assign(this.options, options);
        if (options.stroke !== undefined) this.rectElement.setAttribute("stroke", options.stroke);
        if (options.fill !== undefined) this.rectElement.setAttribute("fill", options.fill);
        if (options.strokeWidth !== undefined) this.rectElement.setAttribute("stroke-width", `${options.strokeWidth}px`);
        if (options.fillOpacity !== undefined) this.rectElement.setAttribute("fill-opacity", `${options.fillOpacity}`);
        if (options.strokeOpacity !== undefined) this.rectElement.setAttribute("stroke-opacity", `${options.strokeOpacity}`);
        if (options.showHandles !== undefined) {
            for (let handleElement of this.handles.values()) {
                handleElement.style.setProperty("display", options.showHandles ? "inherit" : "none");
            }
        }
        return this;
    }
}


export class MarqueeOverlay extends Overlay {
    constructor() {
        super();
        this.rectElement.setAttribute("fill", this.options.fill);
        this.rectElement.setAttribute("stroke-width", this.options.strokeWidth.toString());
        this.rectElement.setAttribute("fill-opacity", this.options.fillOpacity.toString());
    }

    public setOrigin(origin: IPoint): MarqueeOverlay {
        this.origin.x = origin.x;
        this.origin.y = origin.y;
        if (this.isMounted) this.updateRect();
        return this;
    }

    public resetVector(): MarqueeOverlay {
        this.vector.x = 0;
        this.vector.y = 0;
        if (this.isMounted) this.updateRect();
        return this;
    }

    public moveVectorBy(delta: IPoint): MarqueeOverlay {
        this.vector.x += delta.x;
        this.vector.y += delta.y;
        if (this.isMounted) this.updateRect();
        return this;
    }

    private updateRect(): void {
        this.rectElement.setAttribute("x", `${this.x}px`);
        this.rectElement.setAttribute("y", `${this.y}px`);
        this.rectElement.setAttribute("width", `${this.width}px`);
        this.rectElement.setAttribute("height", `${this.height}px`);
    }

    public get x(): number {
        return this.vector.x < 0 ? this.origin.x + this.vector.x : this.origin.x;
    }

    public get y(): number {
        return this.vector.y < 0 ? this.origin.y + this.vector.y : this.origin.y;
    }

    public get width(): number { return Math.abs(this.vector.x); }
    public get height(): number { return Math.abs(this.vector.y); }

    private origin: IPoint = { x: 0, y: 0 };
    private vector: IPoint = { x: 0, y: 0 };

    protected options: Partial<ICanvasOverlayOptions> = {
        stroke: "#007acc",
        fill: "#007acc",
        fillOpacity: .2,
        strokeWidth: .5,
    };

    public setOptions(options: Partial<ICanvasOverlayOptions>): MarqueeOverlay {
        Object.assign(this.options, options);
        if (options.stroke !== undefined) this.rectElement.setAttribute("stroke", options.stroke);
        if (options.fill !== undefined) this.rectElement.setAttribute("fill", options.fill);
        if (options.strokeWidth !== undefined) this.rectElement.setAttribute("stroke-width", `${options.strokeWidth}px`);
        if (options.fillOpacity !== undefined) this.rectElement.setAttribute("fill-opacity", `${options.fillOpacity}`);
        if (options.strokeOpacity !== undefined) this.rectElement.setAttribute("stroke-opacity", `${options.strokeOpacity}`);
        return this;
    }
}


export function isNorth(anchor: TCanvasOverlayHandleAnchor): boolean { return anchor.startsWith("n"); }
export function isEast(anchor: TCanvasOverlayHandleAnchor): boolean { return anchor.endsWith("e"); }
export function isSouth(anchor: TCanvasOverlayHandleAnchor): boolean { return anchor.startsWith("s"); }
export function isWest(anchor: TCanvasOverlayHandleAnchor): boolean { return anchor.endsWith("w"); }
