import { EventTargetMixin } from "./../events";
import { CanvasSnippet } from "./CanvasSnippet";
import { CanvasBlock } from "./CanvasBlock";
import { CanvasLane } from "./CanvasLane";
import { CanvasRoot } from "./CanvasRoot";
import { StateMachine, State } from "./StateMachine";



export class Canvas implements ICanvas, IEventListener {
    constructor(parent: HTMLElement | null, options?: Partial<ICanvasOptions>) {
        this.setupGlobalEventHandlers();
        this.root = new CanvasRoot((id: TId) => this.getItem(id));
        this.connectRootEventHandlers(this.root);
        this.registerItem(this.root);
        if (options) this.setOptions(options);
        if (parent) this.mount(parent);
    }

    truth: ICanvasTruth | null = null;
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

    public deselectAllBut(keep: TId): Canvas {
        let ids: TId[] = [];
        for (let id of this.selection) {
            if (id === keep) continue;
            ids.push(id);
            const item = this.getItem(id);
            if (!item) throw new Error(`Canvas.deselectAllBut: item not found`);
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
     * Connection to the model.
     */
    public setTruth(truth: ICanvasTruth): Canvas {
        this.truth = truth;
        this.update();
        return this;
    }

    public update(): Canvas {
        // add new items
        for (let part of this.truth.elements.values()) {
            if (!this.items.has(part.id)) this.addItem(part);
        }

        // remove deleted
        for (let item of this.items.values()) {
            if (!this.truth.elements.has(item.id) && !Object.is(item, this.root)) {
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
        if (source.type === "block") {
            item = new CanvasBlock(id => this.getItem(id), source);
        } else if (source.type === "snippet") {
            item = new CanvasSnippet(id => this.getItem(id), source);
        } else if (source.type === "lane") {
            item = new CanvasLane(id => this.getItem(id), source);
        }

        this.registerItem(item);

        if (item instanceof CanvasLane) {
            this.connectLaneEventHandlers(item);
            this.root.mountChild(item.id);
        } else {
            this.connectItemEventHandlers(item);
            const lane = (<any>item).getLane();
            lane.mountChild(item.id);
        }

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

    private connectItemEventHandlers(item: ICanvasItem): void {
        item.on("mousedown:item", (e: IEvent) => this.machine.send(e));
        item.on("mousedown:resize-handle", (e: IEvent) => this.machine.send(e));
    }

    private connectLaneEventHandlers(lane: CanvasLane): void {
        lane.on("mousedown:lane", (e: IEvent) => this.machine.send(e));
        lane.on("dblclick:lane", (e: IEvent) => this.machine.send(e));
    }

    private connectRootEventHandlers(root: CanvasRoot): void {
        root.on("mouseup", (e: IEvent) => this.machine.send(e));
        root.on("mousemove", (e: IEvent) => this.machine.send(e));
    }

    private setupGlobalEventHandlers(): void {
        window.addEventListener("keyup", (e: KeyboardEvent) => {
            if (e.key === "Escape") this.machine.send({ type: "escape" });
        });
    }

    /*
     * State machine
     */
    public readonly machine = new StateMachine<Canvas>(this, new ReadyState());

    /*
     * Incoming Domain Events
     */
    notify(event: IEvent) { this.update(); }
}


abstract class CanvasState extends State {
    protected get canvas(): Canvas { return this.context; }
}


class ReadyState extends CanvasState {
    transition(e: IEvent): CanvasState {
        switch (e.type) {
            case "mousedown:item":
                return new MousedownOnItemState();
            case "mousedown:lane":
                return new MousedownOnCanvasState();
            case "mousedown:resize-handle":
                return new ResizeItemState();
            case "dblclick:lane":
                this.addItem(e);
                return this;
            default:
                return this;
        }
    }

    private addItem(e: IEvent): CanvasState {
        console.log("ReadyState.addItem: event", e);
        const isBlock = e.detail.domEvent.altKey;
        const { x, y } = e.detail.position;
        const laneId = e.detail.targetId;
        this.canvas.emitEvent("add", {
            type: isBlock ? "block" : "snippet",
            position: { x, y, laneId },
        });
        return this;
    }
}


class MousedownOnItemState extends CanvasState {
    private targetId?: TId;
    private wasSelected?: boolean;
    private shiftKey?: boolean;

    transition(e: IEvent): CanvasState {
        switch (e.type) {
            case "mousemove":
                return new DragItemState();
            case "mouseup":
                return new ReadyState();
            default:
                return this;
        }
    }

    onEnter(e: IEvent) {
        this.targetId = e.detail!.targetId;
        this.wasSelected = this.canvas.selection.has(this.targetId);
        this.shiftKey = e.detail!.domEvent.shiftKey;
        this.canvas.select(this.targetId, true);
    }

    onExit(e: IEvent) {
        if (e.type === "mouseup" && !this.shiftKey) {
            this.canvas.deselectAllBut(this.targetId);
        }

        else if (e.type === "mouseup" && this.shiftKey && this.wasSelected) {
            this.canvas.deselect(this.targetId);
        }

        else if (e.type === "mousemove" && !this.wasSelected) {
            this.canvas.deselectAllBut(this.targetId);
        }
    }
}


class MousedownOnCanvasState extends CanvasState {
    transition(e: IEvent): CanvasState {
        switch (e.type) {
            case "mouseup":
                return new ReadyState();
            case "mousemove":
                return new MarqueeSelectState();
            default:
                return this;
        }
    }

    onEnter(e: IEvent): void {
        if (!e.detail!.domEvent.shiftKey) this.canvas.clearSelection();
    }
}


class DragItemState extends CanvasState {
    private readonly items = new Set<ICanvasItem>();

    transition(e: IEvent): CanvasState {
        switch (e.type) {
            case "mousemove":
                this.moveTargets(e);
                return this;
            case "mouseup":
            case "escape": // fallthrough
                return new ReadyState();
            default:
                return this;
        }
    }

    onEnter(): void {
        for (let selected of this.canvas.getSelectedItems()) {
            selected.moveToTheFront();
            this.items.add(selected);
            for (let descendant of selected.getDescendants()) {
                descendant.moveToTheFront();
                this.items.add(descendant);
            }
        }
    }

    onExit(e: IEvent): void {
        const abort = e.type === "escape";


        /*
         * We can simply update all items because we haven't committed any model interaction.
         */
        if (abort) {
            this.items.forEach(item => item.update());
        }

        else {
            const items: { id: TId, position: IPoint }[] = [];
            this.items.forEach(item => {
                items.push({ id: item.id, position: { x: item.x, y: item.y } });
            })
            this.canvas.emitEvent("drop", { items });
        }
    }

    moveTargets(e: IEvent): void {
        const delta = { x: e.detail!.domEvent.movementX, y: e.detail!.domEvent.movementY };
        this.items.forEach(item => item.moveBy?.(delta));
    }
}


class ResizeItemState extends CanvasState {
    private anchor?: string;
    private target?: ICanvasItem;
    private hasResized = false;

    transition(e: IEvent): CanvasState {
        switch (e.type) {
            case "mousemove":
                this.resizeTarget(e);
                return this;
            case "mouseup":
            case "escape": // fallthrough
                return new ReadyState();
            default:
                return this;
        }
    }

    onEnter(e: IEvent): void {
        this.anchor = e.detail!.anchor;
        this.target = this.canvas.getItem(e.detail!.targetId);
        this.canvas.deselectAllBut(this.target.id);
        this.target.moveToTheFront();
        for (let descendant of this.target.getDescendants()) descendant.moveToTheFront();
    }

    onExit(e: IEvent): void {
        if (!this.hasResized) return;

        const abort = e.type === "escape";

        /*
         * We can simply update the item because we haven't committed any model interaction.
         */
        if (abort) this.target.update();

        else {
            this.canvas.emitEvent("resize", {
                id: this.target.id,
                size: {
                    x: this.target.x, y: this.target.y,
                    width: this.target.width, height: this.target.height,
                },
            });
        }
    }

    private resizeTarget(e: IEvent) {
        const delta = {
            x: e.detail!.domEvent.movementX,
            y: e.detail!.domEvent.movementY,
        };
        this.target.resize(delta, this.anchor);
        this.hasResized = true;
        return this;
    }
}


class MarqueeSelectState extends CanvasState {
    transition(e: IEvent) {
        return new ReadyState();
    }
}
