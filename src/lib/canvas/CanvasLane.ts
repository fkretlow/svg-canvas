import type { CanvasItem } from "./CanvasItem";
import { createSVGElement } from "./../util";


export class CanvasLane {
    constructor(truth: any) {
        this.truth = truth;

        this.svg = this.createSVGElement();
        this.rectElement = this.createRectElement();
        this.svg.appendChild(this.rectElement);

        this.itemGroupElement = this.createItemGroupElement();
        this.svg.appendChild(this.itemGroupElement);

        this.setupEventListeners();

        this.update();
        this.height = 500;
    }

    private readonly truth: any;
    public get element(): SVGElement { return this.svg; }
    public readonly svg: SVGSVGElement;
    public readonly rectElement: SVGRectElement;
    public readonly itemGroupElement: SVGGElement;

    public get id(): TId { return this.truth.id; }
    public get itemIds(): Iterable<TId> { return this.truth.itemIds; }

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

                Object.assign(e["canvasEventDetail"], {
                    laneId: this.id,
                });
            });
        });
    }

    public update(): CanvasLane {
        this.name = this.truth.name;
        this.color = this.truth.color;
        return this;
    }

    private _selected: boolean = false;
    public get selected(): boolean { return this._selected; }
    private set selected(b: boolean) {
        this._selected = b;
    }

    public mountItem(item: ICanvasItem): CanvasLane {
        this.itemGroupElement.appendChild(item.element);
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

    public panBy(movement: IPoint, vertically = false): CanvasLane {
        this.panOffset = {
            x: this.panOffset.x + movement.x,
            y: vertically ? this.panOffset.y + movement.y : this.panOffset.y,
        }
        return this;
    }

    public setCoordinates(pos: IPoint): CanvasLane {
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

    private _y: number = 0;
    public get y(): number { return this._y; }
    public set y(y: number) {
        this._y = y
        this.svg.setAttribute("y", `${y}px`);
    }

    private _height: number = 0;
    public get height(): number { return this._height; }
    public set height(height: number) {
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
