import { CanvasChild } from "./CanvasItem";
import { createSVGElement } from "./../util";
import { Overlay } from "./Overlay";
import { DEFAULT_FONT_STYLE, TextBlock } from "./text";


export class CanvasSnippet
extends CanvasChild
implements ICanvasChild, ICanvasRectangle, INamedCanvasItem, IEventTarget {
    constructor(getItem: TCanvasItemGetter, truth: ICanvasSourceItem) {
        super(getItem);
        this.truth = truth;

        this.textBlock = new TextBlock();
        this.textBlock.style = this.fontStyle;

        this.containerElement = this.createContainerElement();
        this.rectElement = this.createRectElement();
        this.containerElement.appendChild(this.rectElement);
        this.containerElement.appendChild(this.textBlock.element);

        this.overlay = new Overlay(this);

        this.setupEventListeners();
    }

    private readonly truth: ICanvasSourceItem;
    get id(): TId { return this.truth.id; }

    private createContainerElement(): SVGGElement {
        const g = createSVGElement("g") as SVGGElement;
        g.style.setProperty("contain", "paint");
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
        // TODO: Do this properly...
        const mouseEventTypes = [ "mousemove", "mousedown", "mouseup", "click", "dblclick" ];
        mouseEventTypes.forEach(type => {
            this.rectElement.addEventListener(type, (e: MouseEvent) => {
                const handlers = this.eventTargetMixin.getHandlers(type);
                handlers?.forEach(handler => handler(e));
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
        this.overlay.update();
        return this;
    }

    private _selected: boolean = false;
    public get selected(): boolean { return this._selected; }
    private set selected(b: boolean) {
        this._selected = b;
    }

    public select(): CanvasSnippet {
        this.selected = true;
        this.showOverlay();
        return this;
    }
    public deselect(): CanvasSnippet {
        this.selected = false;
        this.hideOverlay();
        return this;
    }

    public destroy(): void {
        this.extractFromContainer();
    }

    public moveTo(pos: IPoint): CanvasSnippet {
        this.x = pos.x;
        this.y = pos.y;
        this.textBlock.moveTo(pos);
        this.overlay.update();
        return this;
    }

    public moveBy(delta: IPoint): CanvasSnippet {
        this.x += delta.x;
        this.y += delta.y;
        this.textBlock.moveBy(delta);
        this.overlay.update();
        return this;
    }

    public resize(size: ISize): CanvasSnippet {
        this.width = size.width;
        this.height = size.height;
        this.textBlock.resize(size);
        this.overlay.update();
        return this;
    }

    public rename(name: string): CanvasSnippet {
        this.name = name;
        this.textBlock.editText(name);
        return this;
    }

    public showOverlay(options?: object): CanvasSnippet {
        if (this._overlayIsShown) return this;
        this._overlayIsShown = true;
        this.containerElement.insertAdjacentElement("beforeend", this.overlay.element);
        return this;
    }

    public hideOverlay(): CanvasSnippet {
        if (!this._overlayIsShown) return this;
        this._overlayIsShown = false;
        this.containerElement.removeChild(this.overlay.element);
        return this;
    }

    public get element(): SVGElement {
        return this.containerElement;
    }

    private readonly containerElement: SVGGElement;
    private readonly rectElement: SVGRectElement;
    private textBlock: TextBlock;
    private overlay: Overlay;
    private _overlayIsShown = false;

    private _name: string = "";
    public get name(): string { return this._name; }
    private set name(name: string) {
        this._name = name;
    }

    private _x: number = 0;
    public get x(): number { return this._x; }
    private set x(x: number) {
        this._x = x
        this.rectElement.setAttribute("x", `${x}px`);
    }

    private _y: number = 0;
    public get y(): number { return this._y; }
    private set y(y: number) {
        this._y = y
        this.rectElement.setAttribute("y", `${y}px`);
    }

    private _width: number = 0;
    public get width(): number { return this._width; }
    private set width(width: number) {
        this._width = width
        this.rectElement.setAttribute("width", `${width}px`);
    }

    private _height: number = 0;
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
