import { EventTargetMixin } from "./../events";


export abstract class CanvasItem implements ICanvasItem, IEventTarget {
    constructor(getItem: TCanvasItemGetter) {
        this.getItem = getItem;
    }

    abstract readonly id: TId;
    abstract readonly element: SVGElement;
    abstract parentId: TId | null;
    abstract childIds: Iterable<TId> | null;

    protected getItem: TCanvasItemGetter;
    public getParent(): ICanvasItem | null {
        return this.parentId ? this.getItem(this.parentId) : null;
    }

    public *getChildren(): Generator<ICanvasItem> {
        if (this.childIds) {
            for (let id of this.childIds) yield this.getItem(id);
        }
    }

    public *getDescendants(): Generator<ICanvasItem> {
        if (this.childIds) {
            for (let child of this.getChildren()) yield child;
            for (let child of this.getChildren()) yield* child.getDescendants();
        }
    }

    public *getAncestors(): Generator<ICanvasItem> {
        const parent = this.getParent();
        if (parent) {
            yield parent;
            yield* parent.getAncestors();
        }
    }

    public getDepth(): number {
        let depth = 0;
        for (let _ of this.getAncestors()) ++depth;
        return depth;
    }

    public getHeight(): number {
        let height = 0;
        for (let _ of this.getDescendants()) ++height;
        return height;
    }

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

    public destroy(): void {
        this.unmount();
    }

    public mount(parent: Element): CanvasItem {
        parent.appendChild(this.element);
        return this;
    }

    public unmount(): CanvasItem {
        this.element.parentElement?.removeChild(this.element);
        return this;
    }

    /**
     * Apply CSS styles to the svg element. Override this method in subclasses if needed.
     */
    public css(styles: TCSSStylesCollection): CanvasItem {
        for (let [ property, value ] of Object.entries(styles)) {
            this.element.style.setProperty(property, value);
        }
        return this;
    }

    public moveForwards(): CanvasItem {
        const parent = this.element.parentElement;
        if (parent === null) return this;

        const next = this.element.nextElementSibling;
        parent.removeChild(this.element);
        if (next)   next.insertAdjacentElement("afterend", this.element);
        else        parent.insertAdjacentElement("beforeend", this.element);
        return this;
    }

    public moveBackwards(): CanvasItem {
        const parent = this.element.parentElement;
        if (parent === null) return this;

        const prev = this.element.previousElementSibling;
        parent.removeChild(this.element);
        if (prev)   prev.insertAdjacentElement("beforebegin", this.element);
        else        parent.insertAdjacentElement("afterbegin", this.element)
        return this;
    }

    public moveToTheFront(): CanvasItem {
        const parent = this.element.parentElement;
        if (parent === null) return this;

        parent.removeChild(this.element);
        parent.insertAdjacentElement("beforeend", this.element)

        return this;
    }

    public moveToTheBack(): CanvasItem {
        const parent = this.element.parentElement;
        if (parent === null) return this;

        parent.removeChild(this.element);
        parent.insertAdjacentElement("afterbegin", this.element)
        return this;
    }
}
