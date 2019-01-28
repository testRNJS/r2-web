export declare class Rect {
    left: number;
    top: number;
    right: number;
    bottom: number;
    constructor(left: number, top: number, right: number, bottom: number);
    static fromDOMRect(r: DOMRect): Rect;
    width(): number;
    height(): number;
    intersect(r: Rect): boolean;
    overlapHorizontal(rect: Rect): boolean;
    overlapVertical(rect: Rect): boolean;
    horizontalOverlap(rect: Rect): number;
    verticalOverlaop(rect: Rect): number;
}
