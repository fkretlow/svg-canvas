import { EventTargetMixin } from "./../events";
import { CanvasSnippet } from "./CanvasSnippet";
import { CanvasBlock } from "./CanvasBlock";
import { CanvasLane } from "./CanvasLane";
import { CanvasRoot } from "./CanvasRoot";
import { StateMachine, State } from "./StateMachine";
import { isRectangleInRectangle } from "$lib/util";



export class Canvas implements ICanvas, IEventListener {
    constructor(parent: HTMLElement | null, options?: Partial<ICanvasOptions>) {
        this.setupGlobalEventHandlers();
        this.root = new CanvasRoot();
        this.connectRootEventHandlers(this.root);
        if (options) this.setOptions(options);
        if (parent) this.mount(parent);
    }

    truth: ICanvasTruth | null = null;
    readonly root: CanvasRoot;
    readonly options: ICanvasOptions = {};

    /*
     * Item registry
     */
    public readonly items = new Map<TId, ICanvasItem>();
    private registerItem(item: ICanvasItem): void { this.items.set(item.id, item); }
    private unregisterItem(id: TId): boolean { return this.items.delete(id); }
    public getItem(id: TId): ICanvasItem | null { return this.items.get(id) || null; }
    public getAllItems(): Iterable<ICanvasItem> { return this.items.values(); }

    public getParentOf(id: TId): ICanvasItem | null {
        const item = this.getItem(id);
        if (item === null)
            throw new Error(`Canvas.getParentOf: item not found`);
        return item.parentId ? this.getItem(item.parentId) : null;
    }

    public *getChildrenOf(id: TId): Generator<ICanvasItem> {
        const item = this.getItem(id);
        if (item === null)
            throw new Error(`Canvas.getChildrenOf: item not found`);
        if (item.childIds) {
            for (let childId of item.childIds) {
                yield this.getItem(childId);
            }
        }
    }

    public *getDescendantsOf(id: TId): Generator<ICanvasItem> {
        const item = this.getItem(id);
        if (item === null)
            throw new Error(`Canvas.getDescendantsOf: item not found`);
        const children = Array.from(this.getChildrenOf(item.id));
        for (let child of children) yield child;
        for (let child of children) yield* this.getDescendantsOf(child.id);
    }

    public *getAncestorsOf(id: TId): Generator<ICanvasItem> {
        const parent = this.getParentOf(id);
        if (parent) {
            yield parent;
            yield* this.getAncestorsOf(parent.id);
        }
    }

    public getItemDepth(id: TId): number {
        let depth = 0;
        for (let _ of this.getAncestorsOf(id)) ++depth;
        return depth;
    }

    /*
     * Lanes
     */
    public lanes = new Array<CanvasLane>();

    public calculateOptimalLaneWindow(laneId: TId, options?: { minHeight?: number, maxHeight?: number, padding?: number }): { panOffsetY: number, height: number } {
        const lane = this.getLane(laneId);
        if (lane === null)
            throw new Error(`Canvas.calculateOptimalLaneHeight: lane not found`);

        let minHeight = options?.minHeight || -Infinity;
        let maxHeight = options?.maxHeight || Infinity;
        let padding = options?.padding || 30;

        let empty = true;
        let minY = Infinity;
        let maxY = -Infinity;

        for (let itemId of lane.itemIds) {
            empty = false;
            const item = this.getItem(itemId);
            minY = Math.min(minY, item.y);
            maxY = Math.max(maxY, item.y + item.height);
        }

        let height = empty ? 350 : maxY - minY + 2 * padding;
        if (maxHeight > 0) height = Math.min(height, maxHeight);
        if (minHeight > 0) height = Math.max(height, minHeight);
        let panOffsetY = empty ? 0 : -minY + padding;

        return {
            height,
            panOffsetY,
        };
    }

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

        let y: number = 0;
        for (let lane of this.lanes) {
            const { panOffsetY, height } = this.calculateOptimalLaneWindow(lane.id, { minHeight: 400, maxHeight: 600 });
            lane.y = y;
            lane.height = height;
            lane.panOffset = {
                x: lane.panOffset.x,
                y: panOffsetY,
            }
            y += height;
        }

        return this;
    }

    public update(): Canvas {
        // add new lanes
        for (let trueLane of this.truth.lanes) {
            if (this.getLane(trueLane.id) === null) this.addLane(trueLane);
        }

        // add new items
        for (let trueItem of this.truth.elements.values()) {
            if (!this.items.has(trueItem.id)) this.addItem(trueItem);
        }

        // remove deleted
        for (let item of this.items.values()) {
            if (!this.truth.elements.has(item.id) && !Object.is(item, this.root)) {
                this.deleteItem(item.id);
            }
        }

        // update remaining
        for (let item of this.getAllItems()) {
            item.update();
        }

        return this;
    }

    public addLane(source: ICanvasSourceItem): Canvas {
        const previousLane = this.lanes[this.lanes.length-1] || null;
        const lane = new CanvasLane(source);
        lane.setCoordinates({ x: 0, y: previousLane ? previousLane.y + previousLane.height : 0 });
        this.lanes.push(lane);
        this.root.mountLane(lane);
        return this;
    }

    public getLane(id: TId): CanvasLane | null {
        for (let lane of this.lanes) {
            if (id === lane.id) return lane;
        }
        return null;
    }

    public getLaneAt(pt: IPoint): CanvasLane | null {
        for (let lane of this.lanes) {
            if (lane.y <= pt.y && pt.y <= lane.y + lane.height) return lane;
        }
        return null;
    }

    public addItem(source: ICanvasSourceItem): Canvas {
        let item: ICanvasItem;

        if (source.type === "block") {
            item = new CanvasBlock(source);
        } else if (source.type === "snippet") {
            item = new CanvasSnippet(source);
        } else if (source.type === "lane") {
            throw new Error(`Canvas.addItem: we should not end up in the lane branch anymore`);
        }

        this.registerItem(item);
        const lane = this.getLane(item.laneId);
        lane.mountItem(item);

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

    public transformLaneToCanvasCoordinates(laneId: TId, laneCoordinates: IPoint): IPoint {
        const lane = this.getLane(laneId);
        return {
            x: laneCoordinates.x + lane.panOffset.x,
            y: laneCoordinates.y + lane.y + lane.panOffset.y,
        }
    }

    public transformCanvasToLaneCoordinates(laneId: TId, canvasCoordinates: IPoint): IPoint {
        const lane = this.getLane(laneId);
        return {
            x: canvasCoordinates.x - lane.panOffset.x,
            y: canvasCoordinates.y - lane.y - lane.panOffset.y,
        };
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

    private connectRootEventHandlers(root: CanvasRoot): void {
        root.on("*", (e: IEvent) => {
            if (e.detail.laneId && e.detail.canvasCoordinates) {
                e.detail.laneCoordinates = this.transformCanvasToLaneCoordinates(
                    e.detail.laneId,
                    e.detail.canvasCoordinates
                );
            }
            this.machine.send(e);
        });
    }

    private setupGlobalEventHandlers(): void {
        window.addEventListener("keyup", (e: KeyboardEvent) => {
            if (e.key === "Escape") this.machine.send({ type: "escape" });
        });
        window.addEventListener("keydown", (e: KeyboardEvent) => {
            if (e.key === " " && !e.repeat) this.machine.send({ type: "spacedown" })
        });
        window.addEventListener("keyup", (e: KeyboardEvent) => {
            if (e.key === " ") this.machine.send({ type: "spaceup" });
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

    /*
     * Event Handling
     */
    protected eventEmitter = new EventTargetMixin();
    public async emitEvent(type: TEventType, detail?: TEventDetail): Promise<void> {
        this.eventEmitter.emitEvent(type, detail);
    }
    public on(type: string, handler: TMouseEventHandler): Canvas {
        this.eventEmitter.on(type, handler);
        return this;
    }
    public off(type: string, handler?: Function): Canvas {
        this.eventEmitter.off(type, handler);
        return this;
    }

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
                return new MousedownOnLaneState();
            case "mousedown:resize-handle":
                return new ResizeItemState();
            case "dblclick:lane":
                this.addItem(e);
                return this;
            case "spacedown":
                return new SpaceDownState();
            default:
                return this;
        }
    }

    private addItem(e: IEvent): CanvasState {
        console.log("ReadyState.addItem: event", e);
        const isBlock = e.detail.altKey;
        this.canvas.emitEvent("add", {
            type: isBlock ? "block" : "snippet",
            canvasCoordinates: e.detail.canvasCoordinates,
            laneCoordinates: e.detail.laneCoordinates,
            laneId: e.detail.laneId,
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
        this.targetId = e.detail.targetId;
        this.wasSelected = this.canvas.selection.has(this.targetId);
        this.shiftKey = e.detail.shiftKey;
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


class MousedownOnLaneState extends CanvasState {
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
        if (!e.detail.shiftKey) this.canvas.clearSelection();
    }
}


class DragItemState extends CanvasState {
    private items = new Array<ICanvasItem>();

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
        const items = new Set<ICanvasItem>();
        for (let selected of this.canvas.getSelectedItems()) {
            items.add(selected);
            for (let child of this.canvas.getDescendantsOf(selected.id)) {
                items.add(child);
            }
        }

        /*
         * Sort the items by depth in the tree before re-mounting them in the root to prevent
         * messing up the stacking order.
         */
        this.items.push(...items);
        this.items.sort((i1,i2) => this.canvas.getItemDepth(i1.id) - this.canvas.getItemDepth(i2.id));

        for (let item of this.items) {
            item.unmount();
            const canvasCoordinates = this.canvas.transformLaneToCanvasCoordinates(item.laneId, { x: item.x, y: item.y });
            item.setCoordinates(canvasCoordinates);
            this.canvas.root.mountItem(item);
        }
    }

    onExit(e: IEvent): void {
        const abort = e.type === "escape";

        /*
         * We can simply update all items because we haven't committed any model interaction.
         */
        if (abort) this.items.forEach(item => item.update());

        else {
            const items: { id: TId, laneId: TId, laneCoordinates: IPoint }[] = [];

            for (let item of this.items) {
                item.unmount();
                const lane = this.canvas.getLaneAt({ x: item.x, y: item.y });
                const laneCoordinates = this.canvas.transformCanvasToLaneCoordinates(lane.id, { x: item.x, y: item.y });
                lane.mountItem(item);
                item.setCoordinates(laneCoordinates);

                items.push({
                    id: item.id,
                    laneId: lane.id,
                    laneCoordinates,
                });
            }

            this.canvas.emitEvent("drop", { items });
        }
    }

    moveTargets(e: IEvent): void {
        this.items.forEach(item => item.moveBy?.(e.detail.movement));
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
        this.anchor = e.detail.anchor;
        this.target = this.canvas.getItem(e.detail.targetId);
        this.canvas.deselectAllBut(this.target.id);
        this.target.moveToTheFront();
        for (let child of this.canvas.getDescendantsOf(this.target.id)) {
            child.moveToTheFront();
        }
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
        this.target.resize(e.detail.movement, this.anchor);
        this.hasResized = true;
        return this;
    }
}


class MarqueeSelectState extends CanvasState {
    private selectedItems = new Set<TId>();

    transition(e: IEvent) {
        switch (e.type) {
            case "mousemove":
                this.resizeMarquee(e);
                return this;
            case "mouseup":
            case "escape": // fallthrough
                return new ReadyState();
            default:
                return this;
        }
    }

    onEnter(e: IEvent): void {
        this.canvas.root.setMarqueeOrigin(e.detail.canvasCoordinates);
        this.canvas.root.showMarquee();
    }

    onExit(e: IEvent): void {
        this.canvas.root.hideMarquee();

        if (e.type === "escape") {
            for (let id of this.selectedItems) {
                const item = this.canvas.getItem(id);
                item.highlight(0);
            }
        } else {
            this.canvas.clearSelection();
            for (let id of this.selectedItems) {
                this.canvas.select(id, true);
            }
        }
    }

    private resizeMarquee(e: IEvent): void {
        this.canvas.root.resizeMarqueeBy(e.detail.movement);
        for (let item of this.canvas.getAllItems()) {
            const { x, y } = this.canvas.transformLaneToCanvasCoordinates(item.laneId, item);
            const rect = { x, y, width: item.width, height: item.height };
            if (isRectangleInRectangle(rect, this.canvas.root.marquee)) {
                this.selectedItems.add(item.id);
                item.highlight();
            } else {
                this.selectedItems.delete(item.id);
                item.highlight(0);
            }
        }
    }
}


class PanState extends CanvasState {
    constructor(laneId: TId) {
        super();
        this.laneId = laneId;
    }

    private laneId: TId | null;
    private spaceWasReleased = false;

    transition(e: IEvent) {
        switch (e.type) {
            case "mousemove":
                this.pan(e);
                return this;
            case "spaceup":
                this.spaceWasReleased = true;
                return this;
            case "mouseup":
                if (this.spaceWasReleased) return new ReadyState();
                else return new SpaceDownState();
            case "escape":
                return new ReadyState();
            default:
                return this;
        }
    }

    private pan(e: IEvent) {
        for (let lane of this.canvas.lanes) {
            const vertically = lane.id === this.laneId;
            lane.panBy(e.detail.movement, vertically);
        }
    }

    onEnter(): void {
        this.canvas.root.css({ cursor: "grabbing" });
    }

    onExit(): void {
        this.canvas.root.css({ cursor: "default" });
    }
}


class SpaceDownState extends CanvasState {
    transition(e: IEvent): CanvasState {
        switch (e.type) {
            case "mousedown:lane":
            case "mousedown:item": // fallthrough
                return new PanState(e.detail.laneId);
            case "spaceup":
                return new ReadyState();
            default:
                return this;
        }
    }

    onEnter(): void {
        this.canvas.root.css({ cursor: "grab" });
    }

    onExit(): void {
        this.canvas.root.css({ cursor: "default" });
    }
}
