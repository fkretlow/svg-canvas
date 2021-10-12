import { v4 as uuid } from "uuid";
import chroma from "chroma-js";



export class Model implements IEventSource {
    public rectangles = new Array<Snippet | Block>();
    public elementMap = new Map<TId, Snippet | Block>();

    public add(data: IRectangle & { id?: TId, type: "snippet" | "block" }) {
        if (data.type === "snippet") {
            const snippet = new Snippet(data);
            this.elementMap.set(snippet.id, snippet);
            this.rectangles.push(snippet);
            this.dispatchEvent?.("item-added", { id: snippet.id });
        } else if (data.type === "block") {
            console.log("Model: adding new block");
            const block = new Block(data);
            this.elementMap.set(block.id, block);
            this.rectangles.push(block);
            this.dispatchEvent?.("item-added", { id: block.id });
        }
    }

    public insertIntoContainer(childId: TId, containerId: TId) {
        const child = this.elementMap.get(childId) as Snippet;
        const container = this.elementMap.get(containerId) as Block;
        child.parentId = containerId;
        container.childIds.push(childId);
    }

    public extractFromContainer(childId: TId) {
        const child = this.elementMap.get(childId) as Snippet;
        if (!child.parentId) return;
        const container = this.elementMap.get(child.parentId) as Block;
        container.childIds = container.childIds.filter(id => id !== childId);
        child.parentId = null;
    }

    public delete(id: TId): boolean {
        const i = this.rectangles.findIndex(r => r.id === id);
        if (i === -1) return false;
        this.rectangles.splice(i, 1);
        this.elementMap.delete(id);
        this.dispatchEvent?.("item-deleted", { id });
    }

    public move(id: TId, to: IPoint): boolean {
        const rect = this.elementMap.get(id);
        if (rect === undefined) return false;
        Object.assign(rect, to);
        this.dispatchEvent?.("item-moved", { id, to });
        return true;
    }

    public resize(id: TId, size: ISize): boolean {
        const rect = this.elementMap.get(id);
        if (rect === undefined) return false;
        Object.assign(rect, size);
        this.dispatchEvent?.("item-resized", { id, size });
        return true;
    }

    public changeColor(id: TId, color?: string): boolean {
        const rect = this.elementMap.get(id);
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


export class Snippet implements IRectangle {
    readonly type = "snippet";

    constructor(obj: IRectangle) {
        Object.assign(this, obj);
        console.log(this.id);
    }

    id = uuid();
    parentId: TId | null = null;
    name: string = "unnamed";
    x: number;
    y: number;
    width: number;
    height: number;
    color = chroma.random().hex();
}


export class Block implements IRectangle {
    readonly type = "block";

    constructor(obj: IRectangle) {
        Object.assign(this, obj);
    }

    id = uuid();
    childIds: TId[] = [];
    name: string = "unnamed";
    x: number;
    y: number;
    width: number;
    height: number;
    color = chroma.random().hex();
}
