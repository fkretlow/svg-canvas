import { CanvasItem } from "./CanvasItem";
import { ResizeOverlay, isWest, isNorth, isEast, isSouth } from "./Overlay";
import { createSVGElement } from "./../util";
import {DEFAULT_FONT_STYLE, measureText} from "./text";


export class CanvasBlock extends CanvasItem {
    constructor(truth: ICanvasSourceItem) {
        super();
        this.truth = truth;

        this.containerElement = this.createContainerElement();
        this.rectElement = this.createRectElement();
        this.tabElement = this.createTabElement();
        this.nameElement = this.createNameElement();

        this.containerElement.appendChild(this.tabElement);
        this.containerElement.appendChild(this.rectElement);
        this.tabElement.appendChild(this.nameElement);

        this.overlay = new ResizeOverlay();
        this.setupEventListeners();
    }

    private readonly containerElement: SVGGElement;
    private readonly rectElement: SVGRectElement;
    private readonly tabElement: SVGGElement;
    private readonly nameElement: SVGTextElement;
    private overlay: ResizeOverlay;


    private readonly truth: ICanvasSourceItem;

    public get id(): TId { return this.truth.id; }

    public get laneId(): TId | null {
        try     { return this.truth.laneId; }
        catch   { return null; }
    }

    public get parentId(): TId | null {
        try     { return this.truth.parentId; }
        catch   { return null; }
    }

    public get childIds(): Iterable<TId> { return this.truth.childIds; }

    private createContainerElement(): SVGGElement {
        const g = createSVGElement("g") as SVGGElement;
        g.style.setProperty("contain", "paint");
        g.setAttribute("data-ref-id", this.truth.id);
        return g;
    }

    private createRectElement(): SVGRectElement {
        const rect = createSVGElement("rect") as SVGRectElement;
        rect.dataset.refId = this.id;
        rect.setAttribute("stroke", "#444");
        rect.setAttribute("stroke-width", "0.75");
        return rect;
    }

    private tabElementSize: ISize = { width: 80, height: 20 };

    private createTabElement(): SVGGElement {
        const g = createSVGElement("g") as SVGGElement;
        const tab = createSVGElement("rect") as SVGRectElement;
        tab.setAttribute("width", `${this.tabElementSize.width}`);
        tab.setAttribute("height", `${this.tabElementSize.height}`);
        tab.setAttribute("fill", "#888");
        tab.setAttribute("stroke", "#444");
        tab.setAttribute("stroke-width", "0.75");
        tab.setAttribute("transform", `translate(0 ${-this.tabElementSize.height})`);
        g.appendChild(tab);
        return g;
    }

    private createNameElement(): SVGTextElement {
        const text = createSVGElement("text") as SVGTextElement;
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("fill", "white");
        text.setAttribute("x", `${this.tabElementSize.width / 2}`);
        text.setAttribute("y", `${-this.tabElementSize.height / 2}`);
        for (let [ prop, value ] of Object.entries(DEFAULT_FONT_STYLE)) {
            text.style.setProperty(prop, value);
        }
        return text;
    }

    private setupEventListeners(): void {
        [ "mousedown", "click", "dblclick" ].forEach(type => {
            this.rectElement.addEventListener(type, (e: MouseEvent) => {
                if (e["canvasEventDetail"] === undefined) e["canvasEventDetail"] = {};
                Object.assign(e["canvasEventDetail"], {
                    eventType: type + ":item",
                    targetType: "block",
                    targetId: this.id,
                });
            });
        });

        this.containerElement.addEventListener("mousedown", (e: MouseEvent) => {
            if (e["canvasEventDetail"] === undefined)
                throw new Error(`CanvasBlock: received event ${e.type} without canvasEventDetail`);
            Object.assign(e["canvasEventDetail"], {
                targetId: this.id,
            });
        });
    }

    public update(): CanvasBlock {
        this.x = this.truth.x;
        this.y = this.truth.y;
        this.width = this.truth.width;
        this.height = this.truth.height;
        this.color = this.truth.color;
        this.name = this.truth.name;
        this.overlay.update(this);
        return this;
    }

    public resize(delta: IPoint, anchor: "nw" | "ne" | "se" | "sw"): CanvasBlock {
        let x = this.x;
        let y = this.y;
        let width = this.width;
        let height = this.height;

        if (isWest(anchor))     x += delta.x;
        if (isNorth(anchor))    y += delta.y;

        if (isWest(anchor))     width -= delta.x;
        else                    width += delta.x;

        if (isNorth(anchor))    height -= delta.y;
        else                    height += delta.y;

        if (isNorth(anchor))    this.y = y;
        if (isWest(anchor))     this.x = x;

        if (isWest(anchor) || isEast(anchor))   this.width = width;
        if (isNorth(anchor) || isSouth(anchor)) this.height = height;

        this.overlay.update(this);

        return this;
    }

    private _selected: boolean = false;
    public get selected(): boolean { return this._selected; }
    private set selected(b: boolean) {
        this._selected = b;
    }

    public select(): CanvasBlock {
        this.selected = true;
        this.highlight(2);
        return this;
    }
    public deselect(): CanvasBlock {
        this.selected = false;
        this.highlight(0);
        return this;
    }

    public destroy(): void {
        this.unmount();
    }

    public setCoordinates(pos: IPoint): CanvasBlock {
        this.x = pos.x;
        this.y = pos.y;
        this.overlay.update(this);
        return this;
    }

    public moveBy(delta: IPoint): CanvasBlock {
        this.x += delta.x;
        this.y += delta.y;
        this.overlay.update(this);
        return this;
    }

    public rename(name: string): CanvasBlock {
        this.name = name;
        return this;
    }

    public highlight(level: number = 1): CanvasBlock {
        if (level <= 0) {
            this.hideOverlay();
        } else if (level === 1) {
            this.showOverlay({
                strokeWidth: 1,
                strokeOpacity: .6,
                showHandles: false,
            });
        } else {
            this.showOverlay({
                strokeWidth: 1,
                strokeOpacity: 1,
                showHandles: true,
            });
        }
        return this;
    }

    public showOverlay(options?: object): CanvasBlock {
        if (options) this.overlay.setOptions(options);
        this.overlay.mount(this.containerElement);
        return this;
    }

    public hideOverlay(): CanvasBlock {
        this.overlay.unmount();
        return this;
    }

    public get element(): SVGElement {
        return this.containerElement;
    }

    private _name: string = "";
    public get name(): string { return this._name; }
    private set name(name: string) {
        this._name = name;
        this.nameElement.textContent = name;
        const metrics = measureText(name);
        this.nameElement.setAttribute("dy", `${(metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) / 2}`);
    }

    public get x(): number { return this._x; }
    private set x(x: number) {
        this._x = x;
        this.containerElement.setAttribute("transform", `translate(${this._x} ${this._y})`);
    }

    public get y(): number { return this._y; }
    private set y(y: number) {
        this._y = y
        this.containerElement.setAttribute("transform", `translate(${this._x} ${this._y})`);
    }

    public get width(): number { return this._width; }
    private set width(width: number) {
        this._width = width
        this.rectElement.setAttribute("width", `${width}px`);
    }

    public get height(): number { return this._height; }
    private set height(height: number) {
        this._height = height
        this.rectElement.setAttribute("height", `${height}px`);
    }

    private _color: string = "none";
    public get color(): string { return this._color; }
    private set color(color: string) {
        this._color = color;
        this.rectElement.style.setProperty("fill", color);
    }
}
