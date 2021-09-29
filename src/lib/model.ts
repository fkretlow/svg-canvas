import { v4 as uuid } from "uuid";
import chroma from "chroma-js";



export class Model implements IEventSource {
    public rectangles = new Array<Rectangle>();
    public idToRectangle = new Map<TId, Rectangle>();

    public add(data: IRectangle) {
        const rect = new Rectangle(data);
        this.idToRectangle.set(rect.id, rect);
        this.rectangles.push(rect);
        this.dispatchEvent?.("item-added", { id: rect.id });
    }

    public delete(id: TId): boolean {
        const i = this.rectangles.findIndex(r => r.id === id);
        if (i === -1) return false;
        this.rectangles.splice(i, 1);
        this.idToRectangle.delete(id);
        this.dispatchEvent?.("item-deleted", { id });
    }

    public move(id: TId, to: IPoint): boolean {
        const rect = this.idToRectangle.get(id);
        if (rect === undefined) return false;
        Object.assign(rect, to);
        this.dispatchEvent?.("item-moved", { id, to });
        return true;
    }

    public resize(id: TId, size: ISize): boolean {
        const rect = this.idToRectangle.get(id);
        if (rect === undefined) return false;
        Object.assign(rect, size);
        this.dispatchEvent?.("item-resized", { id, size });
        return true;
    }

    public changeColor(id: TId, color?: string): boolean {
        const rect = this.idToRectangle.get(id);
        if (rect === undefined) return false;
        color = color || chroma.random().hex();
        rect.color = color;
        this.dispatchEvent?.("item-edited", { id, color });
        return true;
    }

    private dispatchEvent: TEventDispatcher | null = null;
    public setEventDispatcher(dispatcher: TEventDispatcher): void {
        this.dispatchEvent = dispatcher;
    }
    public removeEventDispatcher(): void {
        this.dispatchEvent = null;
    }
}


export class Rectangle {
    constructor(obj: IRectangle) {
        Object.assign(this, obj);
    }

    id = uuid();
    color = chroma.random().hex();
    x: number;
    y: number;
    width: number;
    height: number;
}
