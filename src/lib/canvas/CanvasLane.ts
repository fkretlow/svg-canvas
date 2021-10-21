import { CanvasItem } from "./CanvasItem";
import { createSVGElement } from "./../util";
import { transformWindowToSVGCoordinates } from "./../util";


export class CanvasLane extends CanvasItem {
    constructor(getItem: TCanvasItemGetter, truth: ICanvasSourceItem) {
        super(getItem);
        this.truth = truth;

        this.svg = this.createSVGElement();
        this.rectElement = this.createRectElement();
        this.svg.appendChild(this.rectElement);
        this.itemGroupElement = this.createItemGroupElement();
        this.svg.appendChild(this.itemGroupElement);
        this.setupEventListeners();
        this.update();
    }

    private readonly truth: ICanvasSourceItem;
    public get element(): SVGElement { return this.svg; }
    public readonly svg: SVGSVGElement;
    public readonly rectElement: SVGRectElement;
    public readonly itemGroupElement: SVGGElement;

    public get id(): TId { return this.truth.id; }
    public readonly parentId = null;

    public get childIds(): Iterable<TId> { return this.truth.childIds; }

    private createSVGElement(): SVGSVGElement {
        const svg = createSVGElement("svg") as SVGSVGElement;
        svg.setAttribute("x", "0");
        return svg;
    }

    private createItemGroupElement(): SVGGElement {
        const g = createSVGElement("g") as SVGGElement;
        return g;
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
        [ "mousedown", "click", "dblclick" ].forEach(type => {
            this.svg.addEventListener(type, (e: MouseEvent) => {
                if (e["canvasEventDetail"] === undefined) e["canvasEventDetail"] = {
                    eventType: type + ":lane",
                    targetId: this.id,
                };
                const laneCoordinates = transformWindowToSVGCoordinates(this.rectElement, e, false);
                laneCoordinates.x -= this.panOffset.x;
                laneCoordinates.y -= this.panOffset.y;

                Object.assign(e["canvasEventDetail"], {
                    laneId: this.id,
                    laneCoordinates,
                });
            });
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
        this.itemGroupElement.appendChild(child.element);
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

    public panBy(movement: IPoint): CanvasLane {
        this.panOffset = {
            x: this.panOffset.x + movement.x,
            y: this.panOffset.y + movement.y,
        }
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
        this.svg.setAttribute("y", `${y}px`);
    }

    public get height(): number { return this._height; }
    private set height(height: number) {
        this._height = height
        this.svg.setAttribute("height", `${height}px`);
    }

    private _color: string = "gray";
    public get color(): string { return this._color; }
    private set color(color: string) {
        this._color = color
        this.svg.setAttribute("fill", color);
    }

    private _panOffset: IPoint = { x: 0, y: 0 };
    public get panOffset(): IPoint { return this._panOffset; }
    public set panOffset(offset: IPoint) {
        this._panOffset = offset;
        this.itemGroupElement.setAttribute("transform", `translate(${this.panOffset.x} ${this.panOffset.y})`);
    }
}
