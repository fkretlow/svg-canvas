import { EventTargetMixin } from "./../events";
import { StateMachine, IState } from "./StateMachine";
import { CanvasSnippet } from "./CanvasSnippet";
import { CanvasRoot } from "./CanvasRoot";


type TCanvasItemGetter = ((id: TId) => ICanvasItem | null);

type TCanvasStateKey =
    "lasso-select" |
    "drag-item" |
    "rename-item" |
    "resize-item" |
    "init";


export class Canvas extends StateMachine<TCanvasStateKey> implements ICanvas {
    constructor(parent: HTMLElement | null, options?: Partial<ICanvasOptions>) {
        super();
        this.initializeStateMachine();
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
    protected async emitEvent(type: TEventType, detail?: TEventDetail): Promise<void> {
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
    private getItem(id: TId): ICanvasItem | null { return this.items.get(id) || null; }
    private registerItem(item: ICanvasItem): void { this.items.set(item.id, item); }
    private unregisterItem(id: TId): boolean { return this.items.delete(id); }

    /*
     * Selection
     */
    public readonly selection = new Set<TId>();

    public select(id: TId, multiple: boolean = false): Canvas {
        const item = this.getItem(id);
        if (!item) throw new Error(`Canvas.select: item not found`);
        if (!multiple) this.selection.clear();
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
            let hasMoved = false;

            const _onmousemove = (e: MouseEvent) => {
                if (!hasMoved) {
                    hasMoved = true;
                    this.emitEvent("grab", { id: item.id });
                    item.moveToTheFront();
                }

                const delta = { x: e.movementX, y: e.movementY };
                item.moveBy(delta);
                this.emitEvent("drag", { id: item.id, delta });
            };

            const _onmouseup = (e: MouseEvent) => {
                e.stopPropagation();

                window.removeEventListener("mousemove", _onmousemove, true);
                window.removeEventListener("mouseup", _onmouseup, true);

                if (hasMoved) {
                    this.emitEvent("drop", { id: item.id, position: { x: item.x, y: item.y }});
                }

                else {
                    if (e.altKey)   this.delete(item.id);
                    else            this.select(item.id, e.shiftKey);
                }
            };

            window.addEventListener("mousemove", _onmousemove, true);
            window.addEventListener("mouseup", _onmouseup, true);
        });
    }

    private setupRootEventHandlers(root: CanvasRoot): void {
        root.on("mouseup", () => this.clearSelection());
    }

    /*
     * State machine
     */
    private initializeStateMachine(): void {
        this.registerState({
            key: "init",
            transition: (event: IEvent): TCanvasStateKey => {
                switch (event.type) {
                    case "item:mousedown":
                        return "drag-item";
                    default:
                        return "init";
                }
            },
        });

        this.registerState({
            key: "drag-item",

            transition: (event: IEvent): TCanvasStateKey => {
                switch (event.type) {
                    case "mousemove":
                        return "drag-item";
                    case "mouseup":
                        return "init";
                    default:
                        return "drag-item";
                }
            },

            initialize: (event: IEvent): void => {
                const items = [...this.selection].map(id => this.getItem(id)) as any[];
                let hasMoved = false;

                const _onmousemove = (e: MouseEvent) => {
                    if (!hasMoved) {
                        hasMoved = true;
                        items.forEach(item => item.moveToTheFront());
                    }

                    const delta = { x: e.movementX, y: e.movementY };
                    items.forEach(item => item.moveBy(delta));
                };

                const _onmouseup = (e: MouseEvent) => {
                    e.stopPropagation();

                    window.removeEventListener("mousemove", _onmousemove, true);
                    window.removeEventListener("mouseup", _onmouseup, true);

                    if (hasMoved) {
                        this.emitEvent("drop", {
                            data: items.map(item => {
                                return {
                                    id: item.id,
                                    position: { x: item.x, y: item.y },
                                };
                            }),
                        });
                    }
                };
            },
        });

        this.setState("init");
    }
}
