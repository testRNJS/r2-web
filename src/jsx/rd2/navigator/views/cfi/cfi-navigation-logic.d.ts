import { ElementBlacklistedChecker } from './element-checker';
import { Rect } from './rect';
export declare class CfiNavigationLogic {
    private rootDocument;
    private elementChecker;
    private columnSize;
    constructor(doc: Document, eleChecker: ElementBlacklistedChecker);
    setColumnSize(width: number, height: number): void;
    getCfiFromElementId(elementId: string): string | null;
    getCfiFromElement(element: Element): string;
    getFirstVisibleCfi(viewport: Rect, fromEnd: boolean): string | null;
    getOffsetByCfi(cfi: string): [number, number] | null;
    getElementByCfi(cfi: string): Node | null;
    getOffsetFromElement(ele: Node): [number, number] | null;
    getOffsetFromElementId(eleId: string): [number, number] | null;
    getOffsetFromRange(range: Range): [number, number] | null;
    isRangeCfi(partialCfi: string): boolean;
    getElementById(eleId: string): HTMLElement | null;
    private findVisibleLeafNodeCfi;
    private isValidTextNode;
    private isValidTextNodeContent;
    private generateCfiFromRange;
    private getOffsetByRectangles;
    private getElementByPartialCfi;
    private getNodeRangeInfoFromCfi;
    private wrapCfi;
    private createRange;
}
