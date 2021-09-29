export interface ISVGCanvas {
    setData(data: Iterable<ISVGCanvasSourceItem>): ISVGCanvas;
    update(): ISVGCanvas;
    select(id: TId): ISVGCanvas;
}


export interface ISVGCanvasSourceItem {
    id: TId;
    x: number;
    y: number;
    width: number;
    height: number;
    parentId?: TId | null;
    childIds?: Iterable<TId> | null;
}


export interface ISVGCanvasOptions {
    styles: TCSSStylesCollection;
}


const SVG_NAMESPACE = "http://www.w3.org/2000/svg";


export class SVGCanvas implements ISVGCanvas {
    constructor(parent: HTMLElement | null, options?: Partial<ISVGCanvasOptions>) {
        if (options) this.setOptions(options);
        this.createSvgElement();
        if (parent) this.mount(parent);
    }

    private data: Iterable<ISVGCanvasSourceItem> | null = null;
    private readonly items = new Map<TId, SVGItem>();
    private svg: SVGElement;
    private readonly options: ISVGCanvasOptions = {
        styles: {
            width: "800px",
            height: "600px",
            "background-color": "#edc",
            "border": "1px solid black",
        }
    };

    private createSvgElement(): void {
        this.svg = document.createElementNS(SVG_NAMESPACE, "svg") as SVGElement;
        for (let [ property, value ] of Object.entries(this.options.styles)) {
            this.svg.style.setProperty(property, value);
        }
    }

    public setData(data: Iterable<ISVGCanvasSourceItem>): SVGCanvas {
        this.data = data;
        return this;
    }

    public update(): SVGCanvas {
        if (!this.data) throw new Error(`SVGCanvas.update: no data`);
        const dataIds = new Set<TId>();
        for (let item of this.data) dataIds.add(item.id);

        // delete all deleted
        for (let id of this.items.keys()) {
            if (!dataIds.has(id)) {
                const item = this.items.get(id);
                item.unmount();
                this.items.delete(id);
            }
        }

        // update all remaining
        for (let item of this.items.values()) item.update();

        // add all new
        for (let source of this.data) {
            if (!this.items.has(source.id)) {
                console.log("adding item:", source);
                const item = new SVGItem(source);
                this.items.set(item.id, item);
                item.mount(this.svg);
            }
        }

        return this;
    }

    public select(id: TId): SVGCanvas { return this; }

    public setOptions(options: Partial<ISVGCanvasOptions>): SVGCanvas {
        Object.assign(this.options, options);
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
}


class SVGItem {
    constructor(source: ISVGCanvasSourceItem) {
        this.createRectElement();
        this.source = source;
        this.update();
    }

    element: SVGRectElement;
    source: ISVGCanvasSourceItem;

    private createRectElement(): void {
        this.element = document.createElementNS(SVG_NAMESPACE, "rect") as SVGRectElement;
    }

    public update() {
        this.x = this.source.x;
        this.y = this.source.y;
        this.width = this.source.width;
        this.height = this.source.height;
    }

    public mount(svg: SVGElement): void {
        svg.appendChild(this.element);
    }

    public unmount(): boolean {
        if (!this.element.parentElement) return false;
        this.element.parentElement.removeChild(this.element);
        return true;
    }

    public get id(): TId { return this.source.id; }

    private _x: number = 0;
    public get x(): number { return this._x; }
    public set x(x: number) {
        this._x = x
        this.element.setAttribute("x", `${x}`);
    }

    private _y: number = 0;
    public get y(): number { return this._y; }
    public set y(y: number) {
        this._x = y
        this.element.setAttribute("y", `${y}`);
    }

    private _width: number = 0;
    public get width(): number { return this._width; }
    public set width(width: number) {
        this._x = width
        this.element.setAttribute("width", `${width}`);
    }

    private _height: number = 0;
    public get height(): number { return this._height; }
    public set height(height: number) {
        this._x = height
        this.element.setAttribute("height", `${height}`);
    }

    public get parentId(): TId | null {
        try { return this.source.parentId; } catch { return null; }
    }

    public get childIds(): Iterable<TId> | null {
        try { return this.source.childIds; } catch { return null; }
    }
}
