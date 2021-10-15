import { v4 as uuid } from "uuid";
import chroma from "chroma-js";
import {isPointInRectangle} from "./util";



export class Model implements IEventSource {
    constructor() {
        this.addLane({ y: 0, height: 500 });
        this.addLane({ y: 500, height: 500 });
        this.addItem({ type: "snippet", laneId: this.lanes[0].id, x: 50, y: 60 });
    }

    public readonly lanes = new Array<Lane>();
    public elements = new Map<TId, Snippet | Block | Lane>();

    public addItem(data: {
        type: "snippet" | "block",
        id?: TId,
        laneId: TId,
        x: number,
        y: number,
        width?: number,
        height?: number,
    }) {
        let item: Snippet | Block;
        if (data.type === "snippet") {
            item = new Snippet(data as any);
        } else if (data.type === "block") {
            item = new Block(data as any);
        }
        this.elements.set(item.id, item);
        this.insertIntoContainer(item.id, data.laneId);
        this.dispatchEvent?.("item-added", { id: item.id });
    }

    public addLane(data: {
        id?: TId,
        y: number,
        height?: number,
        color?: string,
    }) {
        const lane = new Lane(data);
        this.elements.set(lane.id, lane);
        this.lanes.push(lane);
        this.lanes.sort((l1,l2) => l1.y - l2.y);
    }

    public insertIntoContainer(childId: TId, containerId: TId) {
        const child = this.elements.get(childId) as Snippet;
        const container = this.elements.get(containerId) as Block | Lane;
        child.parentId = containerId;
        container.childIds.push(childId);
    }

    public extractFromContainer(childId: TId) {
        const child = this.elements.get(childId) as Snippet;
        if (!child.parentId) return;
        const container = this.elements.get(child.parentId) as Block | Lane;
        container.childIds = container.childIds.filter(id => id !== childId);
        child.parentId = null;
    }

    public delete(id: TId): boolean {
        const rv = this.elements.delete(id);
        this.dispatchEvent?.("item-deleted", { id });
        return rv;
    }

    public move(id: TId, to: IPoint): boolean {
        const rect = this.elements.get(id);
        if (rect === undefined) return false;
        Object.assign(rect, to);
        this.dispatchEvent?.("item-moved", { id, to });

        if (rect instanceof Snippet) {
            if (rect.parentId !== null) this.extractFromContainer(id);
            const blockId = this.getBlockAt(to);
            if (blockId) this.insertIntoContainer(id, blockId);
        }

        return true;
    }

    public resize(id: TId, size: IRectangle): boolean {
        const rect = this.elements.get(id);
        if (rect === undefined) return false;
        Object.assign(rect, size);
        this.dispatchEvent?.("item-resized", { id });
        return true;
    }

    public changeColor(id: TId, color?: string): boolean {
        const rect = this.elements.get(id);
        if (rect === undefined) return false;
        color = color || chroma.random().hex();
        rect.color = color;
        this.dispatchEvent?.("item-edited", { id, color });
        return true;
    }

    private getBlockAt(pos: IPoint): TId | null {
        for (let item of this.elements.values()) {
            if (item instanceof Block && isPointInRectangle(pos.x, pos.y, item)) return item.id;
        }
        return null;
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

    constructor(data: {
        x: number, y: number,
        id?: TId,
        name?: string,
        color?: string,
    }) {
        this.x = data.x;
        this.y = data.y;
        if (data.id) this.id = data.id;
        if (data.name) this.name = data.name;
        if (data.color) this.color = data.color;
    }

    id = uuid();
    parentId: TId | null = null;
    name: string = "Snippet";
    x: number;
    y: number;
    width = 100;
    height = 40;
    color = "orange";
}


export class Block implements IRectangle {
    readonly type = "block";

    constructor(data: {
        x: number, y: number,
        id?: TId,
        name?: string,
        color?: string,
    }) {
        this.x = data.x;
        this.y = data.y;
        if (data.id) this.id = data.id;
        if (data.name) this.name = data.name;
        if (data.color) this.color = data.color;
    }

    id = uuid();
    childIds: TId[] = [];
    name: string = "Block";
    x: number;
    y: number;
    width = 200;
    height = 150;
    color = "lightgray"
}


export class Lane {
    readonly type = "lane";

    constructor(data: {
        id?: TId,
        y: number,
        height?: number,
        name?: string,
    }) {
        this.y = data.y;
        if (data.id) this.id = data.id;
        if (data.height) this.height = data.height;
        if (data.name) this.name = data.name;
    }

    id = uuid();
    childIds: TId[] = [];
    name: string = "Lane";
    y: number;
    height: number = 500;
    color = "gray";
}
