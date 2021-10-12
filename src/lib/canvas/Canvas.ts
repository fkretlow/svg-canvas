import { EventTargetMixin } from "./../events";
import { CanvasSnippet } from "./CanvasSnippet";
import { CanvasBlock } from "./CanvasBlock";
import { CanvasRoot } from "./CanvasRoot";
import { DynamicEventListener, EventListenerRegistry } from "./../events";


export class Canvas implements ICanvas {
    constructor(parent: HTMLElement | null, options?: Partial<ICanvasOptions>) {
        this.setupEventListeners();
        this.root = new CanvasRoot((id: TId) => this.getItem(id));
        this.setupRootEventHandlers(this.root);
        this.registerItem(this.root);
        if (options) this.setOptions(options);
        if (parent) this.mount(parent);
    }

    private truth: Iterable<ICanvasSourceItem> | null = null;
    private readonly root: CanvasRoot;
    private readonly options: ICanvasOptions = {};

    /*
     * Event Handling
     */
    protected eventTargetMixin = new EventTargetMixin();
    public async emitEvent(type: TEventType, detail?: TEventDetail): Promise<void> {
        this.eventTargetMixin.emitEvent(type, detail);
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
    public getItem(id: TId): ICanvasItem | null { return this.items.get(id) || null; }
    private registerItem(item: ICanvasItem): void { this.items.set(item.id, item); }
    private unregisterItem(id: TId): boolean { return this.items.delete(id); }

    /*
     * Selection
     */
    public readonly selection = new Set<TId>();

    public select(id: TId, multiple: boolean = false): Canvas {
        const item = this.getItem(id);
        if (!item) throw new Error(`Canvas.select: item not found`);
        if (!multiple) this.clearSelection();
        this.selection.add(id);
        item.select();
        this.emitEvent("select", { id });
        return this;
    }

    public deselect(id: TId): Canvas {
        const item = this.getItem(id);
        if (!item) throw new Error(`Canvas.deselect: item not found`);
        this.selection.delete(id);
        item.deselect();
        this.emitEvent("deselect", { id });
        return this;
    }

    public clearSelection(): Canvas {
        for (let id of this.selection) this.deselect(id);
        return this;
    }

    public *getSelectedItems(): Generator<any> {
        for (let id of this.selection) yield this.getItem(id);
    }

    /*
     * Model connection
     */
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
        const truthIds = this.processTruth();

        console.log("found", truthIds.size, "truth items");

        // add new items
        for (let part of truthIds.values()) {
            if (!this.items.has(part.id)) this.addItem(part);
        }

        // remove deleted
        for (let item of this.items.values()) {
            if (!truthIds.has(item.id) && !Object.is(item, this.root)) {
                this.deleteItem(item.id);
            }
        }

        // update remaining
        for (let item of this.items.values()) {
            item.update();
        }

        return this;
    }

    public addItem(source: ICanvasSourceItem): Canvas {
        let item: ICanvasItem;
        if (source.hasOwnProperty("childIds")) {
            item = new CanvasBlock(id => this.getItem(id), source);
        } else {
            item = new CanvasSnippet(id => this.getItem(id), source);
        }

        this.registerItem(item);
        this.root.mountChild(item.id);
        this.setupItemEventHandlers(item);

        return this;
    }

    public deleteItem(id: TId): Canvas {
        const item = this.getItem(id);
        if (!item) throw new Error(`Canvas.delete: item not found`);
        this.deselect(id);
        this.unregisterItem(id);
        item.destroy();
        this.emitEvent("delete", { id });
        return this;
    }

    public setOptions(options: Partial<ICanvasOptions>): Canvas {
        Object.assign(this.options, options);
        if (!this.options.styles.contain) this.options.styles.contain = "layout";
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

    private setupItemEventHandlers(item: ICanvasItem): void {
        item.on("mousedown", (e: MouseEvent) => {
            this.transition("mousedown", { targetId: item.id, domEvent: e });
        });
    }

    private setupRootEventHandlers(root: CanvasRoot): void {
        root.on("mouseup", () => this.clearSelection());
    }


    /*
     * State machine
     */
    private state: CanvasState = new ReadyState(this);
    public transition(type: TEventType, detail?: TEventDetail): void {
        const newState = this.state.transition(type, detail);
        if (!Object.is(newState, this.state)) {
            this.state.exit();
            this.state = newState;
            this.state.enter();
        }
    }

    public setEventMask(keys: Iterable<string>): void {
        this.eventListeners.setEventMask(keys);
    }
    private readonly eventListeners = new EventListenerRegistry();
    private setupEventListeners(): void {
        this.eventListeners.registerEventListener("mousemove", new DynamicEventListener(
            window,
            "mousemove",
            (e: MouseEvent) => {
                e.stopPropagation();
                const delta = { x: e.movementX, y: e.movementY };
                this.transition("mousemove", { delta });
            },
            { capture: true },
        ));

        this.eventListeners.registerEventListener("mouseup", new DynamicEventListener(
            window,
            "mouseup",
            (e: MouseEvent) => {
                e.stopPropagation();
                this.transition("mouseup");
            },
            { capture: true },
        ));
    }
}


abstract class CanvasState {
    constructor(protected canvas: Canvas) {}
    abstract transition(type: TEventType, detail?: TEventDetail): CanvasState;
    enter(): void {
        this.canvas.setEventMask(this.events);
    };
    exit(): void {};
    abstract readonly events: Iterable<string>;
}


class ReadyState extends CanvasState {
    readonly events = new Set(["mousedown"]);

    transition(type: TEventType, detail?: TEventDetail): CanvasState {
        switch (type) {
            case "mousedown":
                return this.handleMousedown(detail);
            default:
                return this;
        }
    }

    private handleMousedown({ targetId, domEvent }: any): CanvasState {
        if (!this.canvas.selection.has(targetId)) {
            this.canvas.select(targetId, domEvent.shiftKey);
        }
        return new DragItemState(this.canvas);
    }
}


class DragItemState extends CanvasState {
    readonly events = new Set(["mousemove", "mouseup"]);

    private hasMoved: boolean = false;
    transition(type: TEventType, detail?: TEventDetail): CanvasState {
        switch (type) {
            case "mousemove":
                return this.handleMousemove(detail);
            case "mouseup":
                return this.handleMouseup();
            default:
                return this;
        }
    }

    handleMousemove({ delta }: { delta: IPoint }): CanvasState {
        const items = Array.from(this.canvas.getSelectedItems());
        if (!this.hasMoved) {
            this.hasMoved = true;
            items.forEach((item: any) => item.moveToTheFront?.());
        }
        items.forEach((item: any) => item.moveBy?.(delta));
        return this;
    }

    handleMouseup(): CanvasState {
        const items = [];
        for (let id of this.canvas.selection) {
            const item = this.canvas.getItem(id);
            items.push(item);
            if (item.childIds) {
                for (let id of item.childIds) {
                    items.push(this.canvas.getItem(id));
                }
            }
        }

        this.canvas.emitEvent("drop", {
            items: items.map((item: any) => {
                return {
                    id: item.id,
                    position: { x: item.x, y: item.y }
                };
            }),
        });
        return new ReadyState(this.canvas);
    }
}
