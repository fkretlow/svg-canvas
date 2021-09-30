export interface ISVGCanvas {
    setTruth(data: Iterable<ISVGCanvasSourceItem>): ISVGCanvas;
    update(): ISVGCanvas;
    select(id: TId): ISVGCanvas;
}


export interface ISVGCanvasSourceItem {
    id: TId;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    parentId?: TId | null;
    childIds?: Iterable<TId> | null;
}


export interface ISVGCanvasOptions {
    styles: TCSSStylesCollection;
}


const SVG_NAMESPACE = "http://www.w3.org/2000/svg";


type TMouseEventHandler = ((e: MouseEvent) => any);


export class SVGCanvas implements ISVGCanvas {
    constructor(parent: HTMLElement | null, options?: Partial<ISVGCanvasOptions>) {
        if (options) this.setOptions(options);
        this.svg = this.createSvgElement();
        if (parent) this.mount(parent);
    }

    private truth: Iterable<ISVGCanvasSourceItem> | null = null;
    private readonly items = new Map<TId, SVGItem>();
    private readonly svg: SVGElement;
    private eventHandlers = new Map<string, Function>();
    private dispatchEvent(type: string, detail: any): void {
        const handler = this.eventHandlers.get(type);
        handler?.({ type, detail });
    }

    private readonly options: ISVGCanvasOptions = {
        styles: {
            width: "1000px",
            height: "800px",
            "background-color": "#edc",
            "border": "1px solid black",
        }
    };

    private createSvgElement(): SVGElement {
        const svg = document.createElementNS(SVG_NAMESPACE, "svg") as SVGElement;
        this.applyStyles(svg);
        return svg;
    }

    private applyStyles(svg: SVGElement): void {
        for (let [ property, value ] of Object.entries(this.options.styles)) {
            svg.style.setProperty(property, value);
        }
    }

    public on(type: string, handler: Function): SVGCanvas {
        this.eventHandlers.set(type, handler);
        return this;
    }

    public off(type: string): SVGCanvas {
        this.eventHandlers.delete(type);
        return this;
    }

    public setTruth(data: Iterable<ISVGCanvasSourceItem>): SVGCanvas {
        this.truth = data;
        return this;
    }

    public update(): SVGCanvas {
        if (!this.truth) throw new Error(`SVGCanvas.update: no truth`);
        const truthIds = new Set<TId>();
        for (let item of this.truth) truthIds.add(item.id);

        // delete all deleted
        for (let id of this.items.keys()) {
            if (!truthIds.has(id)) {
                const item = this.items.get(id);
                item.unmount();
                this.items.delete(id);
            }
        }

        // update all remaining
        for (let item of this.items.values()) item.update();

        // add all new
        for (let part of this.truth) {
            if (!this.items.has(part.id)) {
                const item = new SVGItem(part);
                this.setupItemEventHandlers(item);
                this.items.set(item.id, item);
                item.mount(this.svg);
            }
        }

        return this;
    }

    public select(id: TId): SVGCanvas { return this; }

    public setOptions(options: Partial<ISVGCanvasOptions>): SVGCanvas {
        Object.assign(this.options.styles, options.styles);
        if (this.svg) this.applyStyles(this.svg);
        return this;
    }

    public mount(parent: HTMLElement): SVGCanvas {
        parent.appendChild(this.svg);
        return this;
    }

    public unmount(): SVGCanvas {
        this.svg.parentElement?.removeChild(this.svg);
        return this;
    }

    private setupItemEventHandlers(item: SVGItem): void {
        item.on("mousedown", (e: MouseEvent) => {
            this.dispatchEvent("grab", { id: item.id });
            const _onmousemove = (e: MouseEvent) => {
                const delta = { x: e.movementX, y: e.movementY };
                item.moveBy(delta);
                this.dispatchEvent("drag", { id: item.id, delta })
            };
            const _onmouseup = (e: MouseEvent) => {
                window.removeEventListener("mousemove", _onmousemove, true);
                window.removeEventListener("mouseup", _onmouseup, true);
                this.dispatchEvent("drop", { id: item.id, position: { x: item.x, y: item.y }});
            };
            window.addEventListener("mousemove", _onmousemove, true);
            window.addEventListener("mouseup", _onmouseup, true);
        });
        item.on("click", (e: MouseEvent) => {
            this.dispatchEvent("click", {
                id: item.id,
                shiftKey: e.shiftKey,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
            });
        });
    }
}


class SVGItem {
    constructor(truth: ISVGCanvasSourceItem) {
        this.element = this.createRectElement();
        this.setupEventListeners();
        this.truth = truth;
        this.update();
    }

    private readonly element: SVGRectElement;
    private readonly truth: ISVGCanvasSourceItem;
    private eventHandlers: Map<string, TMouseEventHandler> = new Map();

    private createRectElement(): SVGRectElement {
        const element = document.createElementNS(SVG_NAMESPACE, "rect") as SVGRectElement;
        element.setAttribute("stroke", "black");
        element.setAttribute("fill", "white");
        element.style.setProperty("cursor", "move");
        return element;
    }

    private setupEventListeners(): void {
        for (let type of [ "mousedown", "mouseup", "mousemove", "click", "dblclick" ]) {
            this.element.addEventListener(type, (e: MouseEvent) => {
                this.eventHandlers.get(type)?.(e);
            });
        }
    }

    public on(type: string, handler: TMouseEventHandler): SVGItem {
        this.eventHandlers.set(type, handler);
        return this;
    }

    public off(type: string): SVGItem {
        this.eventHandlers.delete(type);
        return this;
    }

    public update(): SVGItem {
        this.x = this.truth.x;
        this.y = this.truth.y;
        this.width = this.truth.width;
        this.height = this.truth.height;
        this.color = this.truth.color;
        return this;
    }

    public mount(svg: SVGElement): SVGItem {
        svg.appendChild(this.element);
        return this;
    }

    public unmount(): SVGItem {
        this.element.parentElement?.removeChild(this.element);
        return this;
    }

    public moveTo(to: IPoint): SVGItem {
        this.x = to.x;
        this.y = to.y;
        return this;
    }

    public moveBy(delta: IPoint): SVGItem {
        this.x += delta.x;
        this.y += delta.y;
        return this;
    }

    public get id(): TId { return this.truth.id; }

    private _x: number = 0;
    public get x(): number { return this._x; }
    public set x(x: number) {
        this._x = x
        this.element.style.setProperty("x", `${x}px`);
    }

    private _y: number = 0;
    public get y(): number { return this._y; }
    public set y(y: number) {
        this._y = y
        this.element.style.setProperty("y", `${y}px`);
    }

    private _width: number = 0;
    public get width(): number { return this._width; }
    public set width(width: number) {
        this._width = width
        this.element.style.setProperty("width", `${width}px`);
    }

    private _height: number = 0;
    public get height(): number { return this._height; }
    public set height(height: number) {
        this._height = height
        this.element.style.setProperty("height", `${height}px`);
    }

    private _color: string = "transparent";
    public get color(): string { return this._color; }
    public set color(color: string) {
        this._color = color;
        this.element.style.setProperty("fill", color);
    }

    public get parentId(): TId | null {
        try { return this.truth.parentId; } catch { return null; }
    }

    public get childIds(): Iterable<TId> | null {
        try { return this.truth.childIds; } catch { return null; }
    }
}
