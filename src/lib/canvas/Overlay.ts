import { createSVGElement } from "$lib/util";

export class Overlay {
    constructor(item: ICanvasRectangle) {
        this.item = item;
        this.groupElement = this.createGroupElement();
        this.rectElement = this.createRectElement();
        this.groupElement.appendChild(this.rectElement);
        this.update();
    }

    public get element(): SVGGElement {
        return this.groupElement;
    }

    public update(): void {
        this.rectElement.setAttribute("x", `${this.item.x}px`);
        this.rectElement.setAttribute("y", `${this.item.y}px`);
        this.rectElement.setAttribute("width", `${this.item.width}px`);
        this.rectElement.setAttribute("height", `${this.item.height}px`);
        this.rectElement.setAttribute("stroke", "#007acc");
        this.rectElement.setAttribute("stroke-width", "2px");
    }

    private item: ICanvasRectangle;
    private rectElement: SVGRectElement;
    private groupElement: SVGGElement;

    private createRectElement(): SVGRectElement {
        const rect = createSVGElement("rect") as SVGRectElement;
        rect.setAttribute("fill", "none");
        return rect;
    }

    private createGroupElement(): SVGGElement {
        return createSVGElement("g") as SVGGElement;
    }
}
