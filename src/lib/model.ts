import { v4 as uuid } from "uuid";



export class Model {
    public rectangles = new Array<Rectangle>();
    public idToRectangle = new Map<TId, Rectangle>();

    public add(data: IRectangle) {
        const rect = new Rectangle(data);
        this.idToRectangle.set(rect.id, rect);
        this.rectangles.push(rect);
    }

    public move(id: TId, to: IPoint): boolean {
        const rect = this.idToRectangle.get(id);
        if (rect === undefined) return false;
        Object.assign(rect, to);
        return true;
    }

    public resize(id: TId, size: ISize): boolean {
        const rect = this.idToRectangle.get(id);
        if (rect === undefined) return false;
        Object.assign(rect, size);
        return true;
    }
}


export class Rectangle {
    constructor(obj: IRectangle) {
        Object.assign(this, obj);
    }

    id = uuid();
    x: number;
    y: number;
    width: number;
    height: number;
}
