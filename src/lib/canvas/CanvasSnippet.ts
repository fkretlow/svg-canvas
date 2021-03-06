import { CanvasItem } from "./CanvasItem";
import { createSVGElement } from "./../util";
import { Overlay } from "./Overlay";
import { DEFAULT_FONT_STYLE, TextBlock } from "./text";


export class CanvasSnippet extends CanvasItem {
    constructor(truth: ICanvasSourceItem) {
        super();
        this.truth = truth;

        this.textBlock = new TextBlock();
        this.textBlock.style = this.fontStyle;

        this.containerElement = this.createContainerElement();
        this.rectElement = this.createRectElement();
        this.containerElement.appendChild(this.rectElement);
        this.containerElement.appendChild(this.textBlock.element);

        this.overlay = new Overlay();

        this.setupEventListeners();
    }

    private readonly truth: ICanvasSourceItem;
    public get id(): TId { return this.truth.id; }

    public get laneId(): TId | null {
        try     { return this.truth.laneId; }
        catch   { return null; }
    }

    public get parentId(): TId { return this.truth.parentId; }

    public get childIds(): null { return null; }

    private createContainerElement(): SVGGElement {
        const g = createSVGElement("g") as SVGGElement;
        g.style.setProperty("contain", "paint");
        g.setAttribute("data-ref-id", this.truth.id);
        return g;
    }

    private createRectElement(): SVGRectElement {
        const rect = createSVGElement("rect") as SVGRectElement;
        rect.dataset.refId = this.id;
        rect.style.setProperty("stroke", "rgba(0,0,0,.3)");
        return rect;
    }

    private fontStyle: IFontStyle = DEFAULT_FONT_STYLE;

    private setupEventListeners(): void {
        [ "mousedown", "click", "dblclick" ].forEach(type => {
            this.rectElement.addEventListener(type, (e: MouseEvent) => {
                if (e["canvasEventDetail"] === undefined) e["canvasEventDetail"] = {};
                Object.assign(e["canvasEventDetail"], {
                    eventType: type + ":item",
                    targetType: "snippet",
                    targetId: this.id,
                });
            });
        });
    }

    public update(): CanvasSnippet {
        this.x = this.truth.x;
        this.y = this.truth.y;
        this.width = this.truth.width;
        this.height = this.truth.height;
        this.color = this.truth.color;
        this.name = this.truth.name;
        this.textBlock.update(this.name, this);
        this.overlay.update(this);
        return this;
    }

    private _selected: boolean = false;
    public get selected(): boolean { return this._selected; }
    private set selected(b: boolean) {
        this._selected = b;
    }

    public select(): CanvasSnippet {
        this.selected = true;
        this.highlight(2);
        return this;
    }
    public deselect(): CanvasSnippet {
        this.selected = false;
        this.highlight(0);
        return this;
    }

    public destroy(): void {
        this.unmount();
    }

    public setCoordinates(pos: IPoint): CanvasSnippet {
        this.x = pos.x;
        this.y = pos.y;
        this.overlay.update(this);
        return this;
    }

    public moveBy(delta: IPoint): CanvasSnippet {
        this.x += delta.x;
        this.y += delta.y;
        this.overlay.update(this);
        return this;
    }

    public rename(name: string): CanvasSnippet {
        this.name = name;
        this.textBlock.setText(name);
        return this;
    }

    public highlight(level: number = 1): CanvasSnippet {
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

    public showOverlay(options?: Partial<ICanvasOverlayOptions>): CanvasSnippet {
        if (options) this.overlay.setOptions(options);
        this.overlay.mount(this.containerElement);
        return this;
    }

    public hideOverlay(): CanvasSnippet {
        this.overlay.unmount();
        return this;
    }

    public get element(): SVGElement {
        return this.containerElement;
    }

    private readonly containerElement: SVGGElement;
    private readonly rectElement: SVGRectElement;
    private textBlock: TextBlock;
    private overlay: Overlay;

    private _name: string = "";
    public get name(): string { return this._name; }
    private set name(name: string) {
        this._name = name;
    }

    public get x(): number { return this._x; }
    private set x(x: number) {
        this._x = x
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
