import { createSVGElement } from "./../util";
import { EventTargetMixin } from "./../events";
import { CanvasSnippet } from "./CanvasSnippet";


export class Canvas implements ICanvas {
    constructor(parent: HTMLElement | null, options?: Partial<ICanvasOptions>) {
        if (options) this.setOptions(options);
        this.svg = this.createSvgElement();
        if (parent) this.mount(parent);
    }

    private truth: Iterable<ICanvasSourceItem> | null = null;
    private readonly svg: SVGElement;

    private readonly options: ICanvasOptions = {
        styles: {
            width: "1000px",
            height: "800px",
            "background-color": "#edc",
            "border": "1px solid black",
        }
    };

    /*
     * Event Handling
     */
    protected eventTargetMixin = new EventTargetMixin();
    protected async emitEvent(type: TEventType, detail?: TEventDetail): Promise<void> {
        return this.eventTargetMixin.emitEvent(type, detail);
    }
    public on(type: string, handler: TMouseEventHandler): Canvas {
        this.eventTargetMixin.on(type, handler);
        return this;
    }
    public off(type: string, handler?: Function): Canvas {
        this.eventTargetMixin.off(type, handler);
        return this;
    }

    /*
     * Item registry
     */
    private readonly items = new Map<TId, ICanvasItem>();
    private getItem(id: TId): ICanvasItem | null { return this.items.get(id) || null; }
    private registerItem(item: ICanvasItem): void { this.items.set(item.id, item); }
    private unregisterItem(id: TId): boolean { return this.items.delete(id); }

    private createSvgElement(): SVGElement {
        const svg = createSVGElement("svg") as SVGElement;
        this.applyStyles(svg);
        return svg;
    }

    private applyStyles(svg: SVGElement): void {
        for (let [ property, value ] of Object.entries(this.options.styles)) {
            svg.style.setProperty(property, value);
        }
    }

    public setTruth(data: Iterable<ICanvasSourceItem>): Canvas {
        this.truth = data;
        return this;
    }

    private processTruth(): Map<TId, ICanvasSourceItem> {
        const truth = new Map<TId, ICanvasSourceItem>();
        for (let part of this.truth) truth.set(part.id, part);
        return truth;
    }

    public update(): Canvas {
        const truth = this.processTruth();

        // remove deleted, update remaining
        for (let item of this.items.values()) {
            if (!truth.has(item.id))    this.delete(item.id);

            else {
                item.update();
                truth.delete(item.id);
            }
        }

        // add new items
        for (let part of truth.values()) {
            if (!this.items.has(part.id)) this.add(part);
        }

        return this;
    }

    public add(source: ICanvasSourceItem): Canvas {
        const item = new CanvasSnippet(this.getItem, source);
        this.registerItem(item);

        const container = this.getItem(item.parentId) as (ICanvasItem & ICanvasContainer);
        if (container) container.appendChild(item.id);
        else {
            item.mount(this.svg);
        }

        return this;
    }

    public delete(ids: Iterable<TId>): Canvas {
        for (let id of ids) {
            const item = this.getItem(id);
            if (item.parentId) (<ICanvasChild>(<unknown>item)).extractFromContainer();
            item.destroy();
            this.unregisterItem(id);
        }
        return this;
    }

    public select(id: TId): Canvas { return this; }

    public setOptions(options: Partial<ICanvasOptions>): Canvas {
        Object.assign(this.options.styles, options.styles);
        if (this.svg) this.applyStyles(this.svg);
        return this;
    }

    public mount(parent: HTMLElement): Canvas {
        parent.appendChild(this.svg);
        return this;
    }

    public unmount(): Canvas {
        this.svg.parentElement?.removeChild(this.svg);
        return this;
    }

    private setupItemEventHandlers(item: ICanvasItem & ICanvasRectangle): void {
        item.on("mousedown", (e: MouseEvent) => {
            this.emitEvent("grab", { id: item.id });
            const _onmousemove = (e: MouseEvent) => {
                const delta = { x: e.movementX, y: e.movementY };
                item.moveBy(delta);
                this.emitEvent("drag", { id: item.id, delta })
            };
            const _onmouseup = (e: MouseEvent) => {
                window.removeEventListener("mousemove", _onmousemove, true);
                window.removeEventListener("mouseup", _onmouseup, true);
                this.emitEvent("drop", { id: item.id, position: { x: item.x, y: item.y }});
            };
            window.addEventListener("mousemove", _onmousemove, true);
            window.addEventListener("mouseup", _onmouseup, true);
        });
        item.on("click", (e: MouseEvent) => {
            this.emitEvent("click", {
                id: item.id,
                shiftKey: e.shiftKey,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
            });
        });
    }
}
