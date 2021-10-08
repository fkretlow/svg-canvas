import { getNextElementInArray, getPreviousElementInArray } from "./../util";
import { EventTargetMixin } from "./../events";


export abstract class CanvasItem implements ICanvasItem, IEventTarget {
    constructor(getItem: TCanvasItemGetter) {
        this.getItem = getItem;
    }

    abstract readonly id: TId;
    abstract readonly element: SVGElement;

    protected getItem: TCanvasItemGetter;

    /*
     * Internal Event Handling
     */
    protected eventTargetMixin = new EventTargetMixin();
    protected async emitEvent(type: TEventType, detail?: TEventDetail): Promise<void> {
        return this.eventTargetMixin.emitEvent(type, detail);
    }
    public on(type: string, handler: TMouseEventHandler): CanvasItem {
        this.eventTargetMixin.on(type, handler);
        return this;
    }
    public off(type: string, handler?: Function): CanvasItem {
        this.eventTargetMixin.off(type, handler);
        return this;
    }

    public mount(parent: Element): CanvasItem {
        parent.appendChild(this.element);
        return this;
    }
    public unmount(): CanvasItem {
        this.element.parentElement?.removeChild(this.element);
        return this;
    }

    public abstract destroy(): void;
    public abstract update(): CanvasItem;
    public abstract select(): CanvasItem;
    abstract css(styles: TCSSStylesCollection): CanvasItem;

    public abstract showOverlay(options?: object): CanvasItem;
    public abstract hideOverlay(): CanvasItem;
}


export abstract class CanvasContainer extends CanvasItem implements ICanvasContainer, IEventTarget {
    constructor(getItem: TCanvasItemGetter) {
        super(getItem);
    }

    readonly childIds: TId[] = [];
    getChildren(): ICanvasItem[] {
        return this.childIds.map((id: TId) => this.getItem(id));
    }

    insertChildBefore(id: TId, beforeId: TId): ICanvasContainer {
        const child = this.getItem(id) as ICanvasChild;
        if (child === null)
            throw new Error(`CanvasContainerMixin.insertChildBefore: there's no element with this id`);

        const next = this.getItem(beforeId) as ICanvasChild;
        if (next === null)
            throw new Error(`CanvasContainerMixin.insertChildBefore: there's no element with this id`);

        let i = this.childIds.findIndex((id: TId) => id === beforeId);
        if (i === -1)
            throw new Error(`CanvasContainerMixin.insertChild: beforeId not found`);

        this.childIds.splice(i, 0, id);
        this.element.insertBefore(child.element, next.element);
        child.parentId = this.id;

        return this;
    }

    extractChild(id: TId): ICanvasContainer {
        const child = this.getItem(id) as ICanvasChild;
        if (child === null)
            throw new Error(`CanvasContainerMixin.insertChildBefore: there's no element with this id`);

        let i = this.childIds.findIndex((childId: TId) => childId === id);
        if (i === -1)
            throw new Error(`CanvasContainerMixin.insertChild: beforeId not found`);

        this.element.removeChild(child.element);
        this.childIds.splice(i, 1);
        child.parentId = null;

        return this;
    }

    appendChild(id: TId): ICanvasContainer {
        const child = this.getItem(id) as ICanvasChild;
        if (child === null)
            throw new Error(`CanvasContainerMixin.insertChildBefore: there's no element with this id`);

        this.childIds.push(id);
        this.element.appendChild(child.element);
        child.parentId = this.id;

        return this;
    }

    prependChild(id: TId): ICanvasContainer {
        const nextId = this.childIds[0];
        if (nextId) return this.insertChildBefore(id, nextId);
        else        return this.appendChild(id);
    }

    getNextChild(id: TId): TId | null {
        const i = this.childIds.findIndex((childId: TId) => childId === id);
        if (i === -1)
            throw new Error(`CanvasContainerMixin.getNextChild: cannot find the given id`);
        return getNextElementInArray(this.childIds, i);
    }

    getPreviousChild(id: TId): TId | null {
        const i = this.childIds.findIndex((childId: TId) => childId === id);
        if (i === -1)
            throw new Error(`CanvasContainerMixin.getNextChild: cannot find the given id`);
        return getPreviousElementInArray(this.childIds, i);
    }
}


export abstract class CanvasChild extends CanvasItem implements ICanvasChild, IEventTarget {
    constructor(getItem: TCanvasItemGetter) {
        super(getItem);
    }

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
        if (container === null)
            throw new Error(`can't get a container`);
        if (!container.hasOwnProperty("childIds"))
            throw new Error(`container has no property 'childIds'`);
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
}
