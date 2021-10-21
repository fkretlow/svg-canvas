import { EventTargetMixin } from "./../events";


export abstract class CanvasItem implements ICanvasItem {
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

    public getRoot(): ICanvasItem {
        const parent = this.getParent();
        return parent ? parent.getRoot() : this;
    }

    public getPanOffset(): IPoint {
        const parent = this.getParent() as any;
        if (!parent)
            throw new Error(`CanvasItem.panOffset: no parent`);
        return parent.getPanOffset();
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

    /*
     * Positioning
     * Override setters and move methods if necessary to adjust SVG element positions.
     */

    protected _x: number = 0;
    public get x(): number { return this._x; }
    protected set x(x: number) { this._x = x }

    protected _y: number = 0;
    public get y(): number { return this._y; }
    protected set y(y: number) { this._y = y }

    protected _width: number = 0;
    public get width(): number { return this._width; }
    protected set width(width: number) {
        this._width = width
    }

    protected _height: number = 0;
    public get height(): number { return this._height; }
    protected set height(height: number) {
        this._height = height
    }

    public moveTo(pos: IPoint): CanvasItem {
        this.x = pos.x;
        this.y = pos.y;
        return this;
    }

    public moveBy(delta: IPoint): CanvasItem {
        this.x += delta.x;
        this.y += delta.y;
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
