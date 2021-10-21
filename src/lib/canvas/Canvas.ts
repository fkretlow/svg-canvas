import { EventTargetMixin } from "./../events";
import { CanvasSnippet } from "./CanvasSnippet";
import { CanvasBlock } from "./CanvasBlock";
import { CanvasLane } from "./CanvasLane";
import { CanvasRoot } from "./CanvasRoot";
import { StateMachine, State } from "./StateMachine";
import {isRectangleInRectangle} from "$lib/util";



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
    public readonly items = new Map<TId, ICanvasItem>();
    public getItem(id: TId): ICanvasItem | null { return this.items.get(id) || null; }
    private registerItem(item: ICanvasItem): void { this.items.set(item.id, item); }
    private unregisterItem(id: TId): boolean { return this.items.delete(id); }

    /*
     * Lanes
     */
    public lanes = new Array<CanvasLane>();

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
        // add new lanes
        for (let trueLane of this.truth.lanes) {
            if (this.getLane(trueLane.id) === null) this.addLane(trueLane);
        }

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

    public addLane(source: ICanvasSourceItem): Canvas {
        const lane = new CanvasLane(id => this.getItem(id), source);
        this.lanes.push(lane);
        this.lanes.sort((l1,l2) => l1.y - l2.y);
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
            item = new CanvasBlock(id => this.getItem(id), source);
        } else if (source.type === "snippet") {
            item = new CanvasSnippet(id => this.getItem(id), source);
        } else if (source.type === "lane") {
            item = new CanvasLane(id => this.getItem(id), source);
        }

        this.registerItem(item);
        const lane = this.getLane(item.laneId);
        lane.mountChild(item.id);

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
            e.detail.spaceKey = this.spaceKey;
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

    private spaceKey: boolean = false;

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
    private laneId: TId | null = null;

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
        this.laneId = e.detail.laneId;
        if (!e.detail.shiftKey) this.canvas.clearSelection();
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
            this.items.add(selected);
            for (let descendant of selected.getDescendants()) {
                this.items.add(descendant);
            }
        }

        for (let item of this.items as Set<any>) {
            item.unmount();
            const canvasCoordinates = this.canvas.transformLaneToCanvasCoordinates(item.laneId, { x: item.x, y: item.y });
            item.moveTo(canvasCoordinates);
            this.canvas.root.mountChild(item.id);
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

            for (let item of this.items as Set<any>) {
                item.unmount();
                const lane = this.canvas.getLaneAt({ x: item.x, y: item.y });
                lane.mountChild(item.id);
                const laneCoordinates = this.canvas.transformCanvasToLaneCoordinates(lane.id, { x: item.x, y: item.y });
                item.moveTo(laneCoordinates);

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
        this.target.resize(e.detail.movement, this.anchor);
        this.hasResized = true;
        return this;
    }
}


class MarqueeSelectState extends CanvasState {
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
    }

    private resizeMarquee(e: IEvent): void {
        this.canvas.root.resizeMarqueeBy(e.detail.movement);
        for (let item of this.canvas.items.values()) {
            // TODO: This is a dirty hack... move the parent/descendant getters to the canvas?
            if (Object.is(item, this.canvas.root)) continue;
            if (isRectangleInRectangle(item, this.canvas.root.marquee)) {
                item.highlight();
            } else {
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

    transition(e: IEvent) {
        switch (e.type) {
            case "mousemove":
                this.pan(e);
                return this;
            case "mouseup":
            case "spaceup": // fallthrough
            case "escape": // fallthrough
                return new ReadyState();
            default:
                return this;
        }
    }

    private pan(e: IEvent) {
        for (let lane of this.canvas.lanes) {
            if (lane.id === this.laneId) lane.panBy(e.detail.movement);
            else lane.panBy({ x: e.detail.movement.x, y: 0 });
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
