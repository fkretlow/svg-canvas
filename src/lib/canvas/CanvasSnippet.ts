import { CanvasChild } from "./CanvasItem";
import { createSVGElement } from "./../util";


export class CanvasSnippet
extends CanvasChild
implements ICanvasChild, ICanvasRectangle, INamedCanvasItem, IEventTarget {
    constructor(getItem: TCanvasItemGetter, truth: ICanvasSourceItem) {
        super(getItem);
        this.truth = truth;
        this._rectElement = this.createRectElement();
        this._nameElement = this.createNameElement();
        this._rectElement.appendChild(this._nameElement);
        this.setupEventListeners();
        this.update();
    }

    private readonly truth: ICanvasSourceItem;
    get id(): TId { return this.truth.id; }

    private createRectElement(): SVGRectElement {
        return createSVGElement("rect") as SVGRectElement;
    }

    private createNameElement(): SVGTextElement {
        return createSVGElement("text") as SVGTextElement;
    }

    private setupEventListeners(): void {
        // TODO: Do this properly...
        const types = [ "mousemove", "mousedown", "mouseup", "click", "dblclick" ];
        types.forEach(type => {
            this._rectElement.addEventListener(type, (e: MouseEvent) => {
                const handlers = this.eventTargetMixin.getHandlers(type);
                handlers?.forEach(handler => handler(e));
            });
        })
    }

    public update(): CanvasSnippet {
        this.x = this.truth.x;
        this.y = this.truth.y;
        this.width = this.truth.width;
        this.height = this.truth.height;
        this.color = this.truth.color;
        this.name = this.truth.name;
        return this;
    }

    public select(): CanvasSnippet { return this; }
    public css(styles: TCSSStylesCollection): CanvasSnippet { return this; }

    public destroy(): void {
        this.extractFromContainer();
    }

    public moveTo(pos: IPoint): CanvasSnippet {
        this.x = pos.x;
        this.y = pos.y;
        return this;
    }

    public moveBy(delta: IPoint): CanvasSnippet {
        this.x += delta.x;
        this.y += delta.y;
        return this;
    }

    public resize(size: ISize): CanvasSnippet {
        this.width = size.width;
        this.height = size.height;
        return this;
    }

    public rename(name: string): CanvasSnippet {
        this.name = name;
        return this;
    }

    public showOverlay(options?: object): CanvasSnippet {
        return this;
    }

    public hideOverlay(): CanvasSnippet {
        return this;
    }

    public get element(): SVGElement {
        return this._rectElement;
    }

    private readonly _rectElement: SVGRectElement;
    private readonly _nameElement: SVGTextElement;

    private _name: string = "";
    public get name(): string {
        return this._name;
    }
    public set name(name: string) {
        this._name = name;
        this._nameElement.textContent = name;
    }

    private _x: number = 0;
    public get x(): number { return this._x; }
    public set x(x: number) {
        this._x = x
        this._rectElement.style.setProperty("x", `${x}px`);
        this._nameElement.style.setProperty("x", `${x}px`);
    }

    private _y: number = 0;
    public get y(): number { return this._y; }
    public set y(y: number) {
        this._y = y
        this._rectElement.style.setProperty("y", `${y}px`);
        this._nameElement.style.setProperty("y", `${y}px`);
    }

    private _width: number = 0;
    public get width(): number { return this._width; }
    public set width(width: number) {
        this._width = width
        this._rectElement.style.setProperty("width", `${width}px`);
        this._nameElement.style.setProperty("inline-size", `${width}px`);
    }

    private _height: number = 0;
    public get height(): number { return this._height; }
    public set height(height: number) {
        this._height = height
        this._rectElement.style.setProperty("height", `${height}px`);
        this._nameElement.style.setProperty("block-size", `${height}px`);
    }

    private _color: string = "transparent";
    public get color(): string { return this._color; }
    public set color(color: string) {
        this._color = color;
        this._rectElement.style.setProperty("fill", color);
    }
}
