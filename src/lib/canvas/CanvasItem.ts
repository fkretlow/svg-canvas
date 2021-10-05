import { getNextElementInArray, getPreviousElementInArray } from "./../util";


export abstract class CanvasItem implements ICanvasItem {
    constructor(getItem: TCanvasItemGetter, truth: ICanvasSourceItem) {
        this.getItem = getItem;
        this.truth = truth;
    }

    abstract readonly element: SVGElement;
    protected readonly truth: ICanvasSourceItem;

    protected getItem: TCanvasItemGetter;
    protected eventHandlers: Map<string, Set<Function>> = new Map();

    protected async emitEvent(type: TEventType, detail?: TEventDetail): Promise<void> {
        const handlers = this.eventHandlers.get(type);
        handlers?.forEach(handler => handler({ type, detail }));
    }

    public on(type: string, handler: TMouseEventHandler): CanvasItem {
        const handlers = this.eventHandlers.get(type);
        if (handlers) {
            handlers.add(handler);
        } else {
            this.eventHandlers.set(type, new Set([ handler ]));
        }
        return this;
    }

    public off(type: string, handler?: Function): CanvasItem {
        if (handler) {
            const handlers = this.eventHandlers.get(type);
            handlers.delete(handler);
        } else {
            this.eventHandlers.delete(type);
        }
        return this;
    }

    public abstract destroy(): void;
    public abstract update(): CanvasItem;
    public abstract moveBy(delta: IPoint): CanvasItem;

    public abstract showOverlay(options?: object): CanvasItem;
    public abstract hideOverlay(): CanvasItem;

    public get id(): TId { return this.truth.id; }

    protected _parentId: TId | null;
    public get parentId(): TId | null {
        return this._parentId;
    }
    public set parentId(id: TId | null) {
        this._parentId = id;
    }

    protected getContainer(): ICanvasContainer | null {
        if (!this.parentId) return null;
        const container = this.getItem(this.parentId) as ICanvasContainer;
        if (container === null || !container.hasOwnProperty("childIds"))
            throw new Error(`can't get a container`);
        return container;
    }

    insertIntoContainer(containerId: TId, beforeId?: TId | null): CanvasItem {
        const container = this.getItem(containerId) as ICanvasContainer;
        if (container === null || !container.hasOwnProperty("insertChild")) {
            throw new Error(`CanvasItem.insertIntoContainer: ${container} is not a container`);
        }
        container.insertChildBefore(this.id, beforeId);
        this.parentId = container.id;
        return this;
    }

    extractFromContainer(): CanvasItem {
        this.getContainer()?.extractChild(this.id);
        this.parentId = null;
        return this;
    }

    moveForwards(steps: number = 1): CanvasItem {
        const container = this.getContainer();
        if (container === null)
            throw new Error(`CanvasItem.moveForwards: not in a container`);

        while (steps > 0) {
            const nextId = container.getNextChild(this.id);
            if (nextId === null) break;
            container.extractChild(nextId);
            container.insertChildBefore(nextId, this.id);
            --steps;
        }

        return this;
    }

    moveBackwards(steps: number = 1): CanvasItem {
        const container = this.getContainer();
        if (container === null)
            throw new Error(`CanvasItem.moveBackwards: not in a container`);

        while (steps > 0) {
            const prevId = container.getPreviousChild(this.id);
            if (prevId === null) break;
            container.extractChild(this.id);
            container.insertChildBefore(this.id, prevId);
            --steps;
        }

        return this;
    }

    moveToTheFront(): CanvasItem {
        const container = this.getContainer();
        if (container === null)
            throw new Error(`CanvasItem.moveBackwards: not in a container`);

        container.extractChild(this.id);
        container.appendChild(this.id);

        return this;
    }

    moveToTheBack(): CanvasItem {
        const container = this.getContainer();
        if (container === null)
            throw new Error(`CanvasItem.moveBackwards: not in a container`);

        container.extractChild(this.id);
        container.prependChild(this.id);

        return this;
    }

    style(styles: TCSSStylesCollection): CanvasItem {
        for (let [ prop, val ] of Object.entries(styles)) {
            this.element.style.setProperty(prop, val);
        }
        return this;
    }
}


export abstract class CanvasContainer extends CanvasItem implements ICanvasContainer {
    constructor(getItem: TCanvasItemGetter, source: any) {
        super(getItem, source);
    }

    protected _childIds: TId[] = [];
    public get childIds(): TId[] { return this._childIds; }

    protected getChildren(): ICanvasItem[] {
        return this.childIds.map(id => this.getItem(id));
    }

    insertChildBefore(id: TId, beforeId: TId): CanvasContainer {
        const child = this.getItem(id) as ICanvasItem;
        if (child === null)
            throw new Error(`CanvasContainer.insertChildBefore: there's no element with this id`);

        const next = this.getItem(beforeId) as ICanvasItem;
        if (next === null)
            throw new Error(`CanvasContainer.insertChildBefore: there's no element with this id`);

        let i = this.childIds.findIndex(id => id === beforeId);
        if (i === -1)
            throw new Error(`CanvasContainer.insertChild: beforeId not found`);

        this.childIds.splice(i, 0, id);
        this.element.insertBefore(child.element, next.element);
        child.parentId = this.id;

        return this;
    }

    extractChild(id: TId): CanvasContainer {
        const child = this.getItem(id) as ICanvasItem;
        if (child === null)
            throw new Error(`CanvasContainer.insertChildBefore: there's no element with this id`);

        let i = this.childIds.findIndex(childId => childId === id);
        if (i === -1)
            throw new Error(`CanvasContainer.insertChild: beforeId not found`);

        this.element.removeChild(child.element);
        this.childIds.splice(i, 1);
        child.parentId = null;

        return this;
    }

    appendChild(id: TId): CanvasContainer {
        const child = this.getItem(id) as ICanvasItem;
        if (child === null)
            throw new Error(`CanvasContainer.insertChildBefore: there's no element with this id`);

        this.childIds.push(id);
        this.element.appendChild(child.element);
        child.parentId = this.id;

        return this;
    }

    prependChild(id: TId): CanvasContainer {
        const nextId = this.childIds[0];
        if (nextId) return this.insertChildBefore(id, nextId);
        else        return this.appendChild(id);
    }

    getNextChild(id: TId): TId | null {
        const i = this.childIds.findIndex(childId => childId === id);
        if (i === -1)
            throw new Error(`CanvasContainer.getNextChild: cannot find the given id`);
        return getNextElementInArray(this.childIds, i);
    }

    getPreviousChild(id: TId): TId | null {
        const i = this.childIds.findIndex(childId => childId === id);
        if (i === -1)
            throw new Error(`CanvasContainer.getNextChild: cannot find the given id`);
        return getPreviousElementInArray(this.childIds, i);
    }
}
