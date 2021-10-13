import { EventTargetMixin } from "./../events";
import { CanvasSnippet } from "./CanvasSnippet";
import { CanvasBlock } from "./CanvasBlock";
import { CanvasRoot } from "./CanvasRoot";
import { isPointInRectangle } from "./../util";


export class Canvas implements ICanvas, IEventListener {
    constructor(parent: HTMLElement | null, options?: Partial<ICanvasOptions>) {
        // this.setupEventListeners();
        this.root = new CanvasRoot((id: TId) => this.getItem(id));
        this.setupRootEventHandlers(this.root);
        this.registerItem(this.root);
        if (options) this.setOptions(options);
        if (parent) this.mount(parent);
    }

    truth: Iterable<ICanvasSourceItem> | null = null;
    readonly root: CanvasRoot;
    readonly options: ICanvasOptions = {};

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

    public deselect(id?: TId): Canvas {
        const ids: Iterable<TId> = id !== undefined ? [ id ] : this.selection;
        for (let id of ids) {
            const item = this.getItem(id);
            if (!item) throw new Error(`Canvas.deselect: item not found`);
            this.selection.delete(id);
            item.deselect();
        }
        this.emitEvent("deselect", { ids });
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
        item.on("mousedown", (e: IEvent) => this.handleInternalEvent(e));
    }

    private setupRootEventHandlers(root: CanvasRoot): void {
        [ "mousedown", "mouseup", "mousemove", "dblclick" ].forEach(type => {
            root.on(type, (e: IEvent) => this.handleInternalEvent(e));
        });
    }

    public findItemsAt(pos: IPoint): TId[] {
        const items = Array.from(this.items.keys()).filter((id: TId) => {
            const item = this.getItem(id) as any;
            return !Object.is(item, this.root) && isPointInRectangle(pos.x, pos.y, item);
        });
        return items;
    }

    public calculateItemDepth(id: TId): number {
        let item = this.getItem(id);
        let depth = 0;
        while (item.hasOwnProperty("parentId") && item.parentId !== null) {
            ++depth;
            item = this.getItem(item.parentId);
        }
        return depth;
    }

    public findLowestContainerAt(pos: IPoint): TId | null {
        const ids = this.findItemsAt(pos);
        let maxDepth = -1;
        let resultId: TId | null = null;
        for (let i = 0; i < ids.length; ++i) {
            const item = this.getItem(ids[i]) as any;
            if (item.childIds === undefined) break;
            const depth = this.calculateItemDepth(item.id);
            if (depth > maxDepth) {
                resultId = item.id;
                maxDepth = depth;
            }
        }
        return resultId;
    }

    /*
     * State machine
     */
    private state: CanvasState = new ReadyState(this);
    public handleInternalEvent(e: IEvent): void {
        const newState = this.state.transition(e);
        if (!Object.is(newState, this.state)) {
            this.state.exit();
            this.state = newState;
            this.state.enter();
        }
    }

    /*
     * Incoming Domain Events
     */
    notify(event: IEvent) { this.update(); }

    readonly eventTypes = {
        receiving: new Set([ "item-added", "item-moved", "item-deleted", "item-resized", "item-edited" ]),
    }
}


abstract class CanvasState {
    constructor(protected canvas: Canvas) {}
    abstract transition(e: IEvent): CanvasState;
    enter(): void {};
    exit(): void {};
}


class ReadyState extends CanvasState {
    transition(e: IEvent): CanvasState {
        switch (e.type) {
            case "mousedown":
                return this.handleMousedown(e);
            case "mouseup":
                return this.handleMouseup(e);
            case "dblclick":
                return this.handleDblclick(e);
            default:
                return this;
        }
    }

    private handleMousedown(e: IEvent): CanvasState {
        if (e.detail!.targetType === "item") {
            if (!this.canvas.selection.has(e.detail!.targetId)) {
                const isMultiple = e.detail!.domEvent.shiftKey;
                this.canvas.select(e.detail!.targetId, isMultiple);
            }
            return new DragItemState(this.canvas);

        } else if (e.detail!.targetType.startsWith("overlay-handle")) {
            const targetId = e.detail.targetId;
            this.canvas.selection.forEach(id => {
                if (id !== targetId) this.canvas.deselect(id);
            });
            return new ResizeItemState(this, e.detail.targetType);
        } else {
            return this;
        }
    }

    private handleMouseup(e: IEvent): CanvasState {
        if (e.detail!.targetType === "canvas") {
            this.canvas.deselect();
        }
        return this;
    }

    private handleDblclick(e: IEvent): CanvasState {
        if (e.detail!.targetType === "canvas") {
            const isBlock = e.detail!.domEvent.altKey;
            this.canvas.emitEvent("add", {
                type: isBlock ? "block" : "snippet",
                position: { x: e.detail!.domEvent.offsetX, y: e.detail!.domEvent.offsetY },
            });
            return this;
        }
    }
}


class DragItemState extends CanvasState {
    private hasMoved: boolean = false;

    transition(e: IEvent): CanvasState {
        switch (e.type) {
            case "mousemove":
                return this.handleMousemove(e);
            case "mouseup":
                return this.handleMouseup(e);
            default:
                return this;
        }
    }

    handleMousemove(e: IEvent): CanvasState {
        const items = Array.from(this.canvas.getSelectedItems());
        if (!this.hasMoved) {
            this.hasMoved = true;
            items.forEach((item: any) => item.moveToTheFront?.());
        }
        const delta = { x: e.detail!.domEvent.movementX, y: e.detail!.domEvent.movementY };
        items.forEach((item: any) => item.moveBy?.(delta));
        return this;
    }

    handleMouseup(e: IEvent): CanvasState {
        if (this.hasMoved) {
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
                        position: { x: item.x, y: item.y },
                    };
                }),
            });
        }
        return new ReadyState(this.canvas);
    }
}


class ResizeItemState extends CanvasState {
    constructor(canvas: Canvas, handle: string) {
        super(canvas);
        this.handle = handle;
    }

    private handle: string;
}
