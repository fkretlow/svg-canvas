import { createSVGElement } from "./../util";
import { EventTargetMixin } from "./../events";
import { CanvasSnippet } from "./CanvasSnippet";
import { CanvasContainer } from "./CanvasItem";
import { v4 as uuid } from "uuid";


export class Canvas implements ICanvas {
    constructor(parent: HTMLElement | null, options?: Partial<ICanvasOptions>) {
        this.root = new CanvasRoot(id => this.getItem(id));
        this.registerItem(this.root);
        console.log(`Canvas.constructor, root should be in here:`);
        this.items.forEach(item => {
            console.log(item.constructor.name);
        })
        if (options) this.setOptions(options);
        if (parent) this.mount(parent);
    }

    private truth: Iterable<ICanvasSourceItem> | null = null;
    private readonly root: CanvasRoot;

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
    private getItem(id: TId): ICanvasItem | null {
        return this.items.get(id) || null;
    }
    private registerItem(item: ICanvasItem): void { this.items.set(item.id, item); }
    private unregisterItem(id: TId): boolean { return this.items.delete(id); }

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
        console.log("Canvas.update: found", truth.size, "truth items");

        // remove deleted, update remaining
        for (let item of this.items.values()) {
            if (!truth.has(item.id) && !Object.is(item, this.root)) {
                this.deleteItems([ item.id ]);
            } else {
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
        const item = new CanvasSnippet(id => this.getItem(id), source);
        this.registerItem(item);
        this.setupItemEventHandlers(item);

        const container = (this.getItem(item.parentId) || this.root) as ICanvasContainer;
        if (container) container.appendChild(item.id);

        return this;
    }

    public deleteItems(ids: Iterable<TId>): Canvas {
        for (let id of ids) {
            const item = this.getItem(id);
            console.log("Canvas.deleteItems: item", item);
            item.destroy();
            this.unregisterItem(id);
        }
        return this;
    }

    public select(id: TId): Canvas {
        const item = this.getItem(id);
        if (!item)
            throw new Error(`Canvas.select: item not found`);
        item.select();
        return this;
    }

    public setOptions(options: Partial<ICanvasOptions>): Canvas {
        Object.assign(this.options.styles, options.styles);
        if (this.root && options.styles !== undefined) this.root.css(options.styles);
        return this;
    }

    public mount(parent: Element): Canvas {
        this.root.mount(parent);
        return this;
    }

    public unmount(): Canvas {
        this.root.unmount();
        return this;
    }

    private setupItemEventHandlers(item: ICanvasItem & ICanvasRectangle): void {
        item.on("mousedown", () => {
            this.emitEvent("grab", { id: item.id });
            const _onmousemove = (e: MouseEvent) => {
                const delta = { x: e.movementX, y: e.movementY };
                item.moveBy(delta);
                this.emitEvent("drag", { id: item.id, delta })
            };
            const _onmouseup = () => {
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


class CanvasRoot extends CanvasContainer {
    constructor(getItem: TCanvasItemGetter) {
        super(getItem);
        this.element = this.createSVGElement();
    }

    readonly id: TId = uuid();
    readonly element: SVGElement;
    protected readonly getItem: TCanvasItemGetter;

    destroy() {}
    update() { return this; }
    select() { return this; }
    showOverlay() { return this; }
    hideOverlay() { return this; }

    mount(parent: Element): CanvasRoot {
        parent.appendChild(this.element);
        return this;
    }

    unmount(): CanvasRoot {
        this.element.parentElement?.removeChild(this.element);
        return this;
    }

    private createSVGElement(): SVGElement {
        const element = createSVGElement("svg") as SVGElement;
        return element;
    }

    public css(styles: TCSSStylesCollection): CanvasRoot {
        for (let [ property, value ] of Object.entries(styles)) {
            this.element.style.setProperty(property, value);
        }
        return this;
    }
}
