import { CanvasItem } from "./CanvasItem";
import { createSVGElement } from "./../util";


export class CanvasLane extends CanvasItem implements ICanvasItem, IEventTarget {
    constructor(getItem: TCanvasItemGetter, truth: ICanvasSourceItem) {
        super(getItem);
        this.truth = truth;

        this.element = this.createSVGElement();
        this.rectElement = this.createRectElement();
        this.element.appendChild(this.rectElement);
        this.setupEventListeners();
    }

    private readonly truth: ICanvasSourceItem;
    public readonly element: SVGElement;
    public readonly rectElement: SVGRectElement;

    private _panOffset: IPoint = { x: 0, y: 0 };
    public get panOffset(): IPoint { return this._panOffset; }
    private set panOffset(offset: IPoint) { this._panOffset = offset; }

    public get id(): TId { return this.truth.id; }
    public readonly parentId = null;

    public get childIds(): Iterable<TId> { return this.truth.childIds; }

    private createSVGElement(): SVGElement {
        const svg = createSVGElement("svg");
        svg.setAttribute("x", "0px");
        svg.style.setProperty("width", "100%");
        return svg;
    }

    private createRectElement(): SVGRectElement {
        const rect = createSVGElement("rect") as SVGRectElement;
        rect.dataset.refId = this.id;
        rect.style.setProperty("stroke", "rgba(0,0,0,.3)");
        rect.style.setProperty("width", "100%");
        rect.style.setProperty("height", "100%");
        rect.style.setProperty("fill", "rgb(240,240,240)");
        return rect;
    }

    private setupEventListeners(): void {
        [ "mousedown", "dblclick" ].forEach(type => {
            this.element.addEventListener(type, (e: MouseEvent) => {
                const x = e.offsetX;
                const y = e.offsetY;
                this.emitEvent(type + ":lane", { targetId: this.id, position: { x, y }, domEvent: e});
            });
        });
        this.element.addEventListener("mousemove", (e: MouseEvent) => {
            const x = e.movementX;
            const y = e.movementY;
            this.emitEvent("mousemove", { targetId: this.id, delta: { x, y }, domEvent: e });
        });
        this.element.addEventListener("mouseup", (e: MouseEvent) => {
            const x = e.offsetX;
            const y = e.offsetY;
            this.emitEvent("mouseup", { targetId: this.id, position: { x, y }, domEvent: e });
        });
    }

    public update(): CanvasLane {
        this.y = this.truth.y;
        this.height = this.truth.height;
        this.name = this.truth.name;
        this.color = this.truth.color;
        for (let child of this.getChildren()) child.update();
        return this;
    }

    private _selected: boolean = false;
    public get selected(): boolean { return this._selected; }
    private set selected(b: boolean) {
        this._selected = b;
    }

    public mountChild(id: TId): CanvasLane {
        const child = this.getItem(id);
        this.element.appendChild(child.element);
        return this;
    }

    public select(): CanvasLane {
        this.selected = true;
        return this;
    }
    public deselect(): CanvasLane {
        this.selected = false;
        return this;
    }

    public moveTo(pos: IPoint): CanvasLane {
        this.y = pos.y;
        return this;
    }

    public moveBy(delta: IPoint): CanvasLane {
        this.y += delta.y;
        return this;
    }

    public rename(name: string): CanvasLane {
        this.name = name;
        return this;
    }

    private _name: string = "";
    public get name(): string { return this._name; }
    private set name(name: string) {
        this._name = name;
    }

    public get y(): number { return this._y; }
    private set y(y: number) {
        this._y = y
        this.element.setAttribute("y", `${y}px`);
    }

    public get height(): number { return this._height; }
    private set height(height: number) {
        this._height = height
        this.element.setAttribute("height", `${height}px`);
    }

    private _color: string = "gray";
    public get color(): string { return this._color; }
    private set color(color: string) {
        this._color = color
        this.element.setAttribute("fill", color);
    }
}
