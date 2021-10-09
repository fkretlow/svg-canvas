import { EventTargetMixin } from "./../events";
import { CanvasSnippet } from "./CanvasSnippet";
import { CanvasRoot } from "./CanvasRoot";


export class Canvas implements ICanvas {
    constructor(parent: HTMLElement | null, options?: Partial<ICanvasOptions>) {
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

        // remove deleted, update remaining
        for (let item of this.items.values()) {
            if (!truthIds.has(item.id) && !Object.is(item, this.root)) {
                this.delete(item.id);
            } else {
                item.update();
                truthIds.delete(item.id);
            }
        }

        // add new items
        for (let part of truthIds.values()) {
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

    public delete(id: TId): Canvas {
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

    private setupItemEventHandlers(item: CanvasSnippet): void {
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
        this.state = this.state.execute(type, detail);
    }
}


abstract class CanvasState {
    constructor(protected canvas: Canvas) {}
    abstract execute(type: TEventType, detail?: TEventDetail): CanvasState;

    protected eventListeners: IEventHandlerRecord[] = [];
    protected attachEventListenerTo(target: EventTarget, type: string, handler: any, capture: boolean) {
        this.eventListeners.push({ target, type, handler, capture });
        target.addEventListener(type, handler, capture);
    }
    protected clearEventListeners(): void {
        while (this.eventListeners.length > 0) {
            const { target, type, handler, capture }: IEventHandlerRecord = this.eventListeners.pop();
            target.removeEventListener(type, handler, capture);
        }
    }
}


class ReadyState extends CanvasState {
    execute(type: TEventType, detail?: TEventDetail): CanvasState {
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
        return new DragState(this.canvas);
    }
}


class DragState extends CanvasState {
    constructor(canvas: Canvas) {
        super(canvas);
        this.setupEventListeners();
    }

    private hasMoved: boolean = false;

    private setupEventListeners() {
        const onmousemove = (e: MouseEvent) => {
            const delta = { x: e.movementX, y: e.movementY };
            this.canvas.transition("mousemove", { delta });
        }
        this.attachEventListenerTo(window, "mousemove", onmousemove, true);

        const onmouseup = (e: MouseEvent) => {
            e.stopPropagation();
            this.canvas.transition("mouseup");
        }
        this.attachEventListenerTo(window, "mouseup", onmouseup, true);
    }

    execute(type: TEventType, detail?: TEventDetail): CanvasState {
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
        const items = [...this.canvas.selection].map(id => this.canvas.getItem(id));
        if (!this.hasMoved) {
            this.hasMoved = true;
            items.forEach((item: any) => item.moveToTheFront?.());
        }
        items.forEach((item: any) => item.moveBy?.(delta));
        return this;
    }

    handleMouseup(): CanvasState {
        const items = [...this.canvas.selection].map(id => this.canvas.getItem(id));
        this.canvas.emitEvent("drop", {
            items: items.map((item: any) => {
                return {
                    id: item.id,
                    position: { x: item.x, y: item.y }
                };
            }),
        });
        this.clearEventListeners();
        return new ReadyState(this.canvas);
    }
}
