import { Rect } from './rect';
export interface IVisibleElementInfo {
    element: HTMLElement | null;
    textNode: Node | null;
    percentVisible: number;
}
export declare class ElementBlacklistedChecker {
    private classBlacklist;
    private idBlacklist;
    private elementBlacklist;
    constructor(clsList: string[], idList: string[], eleList: string[]);
    getClassBlacklist(): string[];
    getIdBlacklist(): string[];
    getElementBlacklist(): string[];
    isElementBlacklisted(node: Node | null): boolean;
}
export declare class ElementVisibilityChecker {
    private rootDoc;
    private viewport?;
    private elementChecker?;
    private isRtl;
    private columnSize;
    constructor(doc: Document, columnSize: [number, number], viewport?: Rect, eleChecker?: ElementBlacklistedChecker);
    findFirstVisibleElement(fromEnd: boolean): IVisibleElementInfo;
    getVisibleTextRange(textNode: Node, toStart: boolean): Range;
    getElementStartOffset(ele: Node): [number, number] | null;
    getRangeStartOffset(range: Range): [number, number] | null;
    findNearestElement(ele: Node): [Node | null, boolean];
    getLeafNodeElements(root: Node | null): Node[];
    private checkVisibility;
    private getNodeRectangles;
    private getRangeRectangles;
    private normalizeDomRectangles;
    private calcVisibility;
    private createRange;
    private createRangeFromNode;
    private splitRange;
    private isValidTextNode;
    private isValidTextNodeContent;
    private isElementNode;
}
