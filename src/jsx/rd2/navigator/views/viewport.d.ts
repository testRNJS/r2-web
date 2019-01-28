import { Location } from '../location';
import { IContentView } from './content-view/content-view';
import { LayoutView, PaginationInfo } from './layout-view';
import { SpineItemView } from './spine-item-view';
import { CancellationToken } from './types';
export declare enum ScrollMode {
    None = 0,
    Publication = 1,
    SpineItem = 2
}
export declare class Viewport {
    private bookView;
    private viewportSize;
    private viewportSize2nd;
    private prefetchSize;
    private visibleViewportSize;
    private viewOffset;
    private startPos?;
    private endPos?;
    private root;
    private clipContatiner;
    private scrollRequestToken?;
    private scrollMode;
    private scrollFromInternal;
    private visiblePagesReadyCallbacks;
    private locationChangedCallbacks;
    constructor(root: HTMLElement);
    addLocationChangedListener(callback: Function): void;
    setView(v: LayoutView): void;
    reset(): void;
    setScrollMode(mode: ScrollMode): void;
    setViewportSize(size: number, size2nd: number): void;
    getViewportSize(): number;
    getViewportSize2nd(): number;
    setPrefetchSize(size: number): void;
    getStartPosition(): PaginationInfo | undefined;
    getEndPosition(): PaginationInfo | undefined;
    renderAtOffset(pos: number, token?: CancellationToken): Promise<void>;
    renderAtSpineItem(spineItemIndex: number, token?: CancellationToken): Promise<void>;
    renderAtLocation(loc: Location, token?: CancellationToken): Promise<void>;
    renderAtAnchorLocation(href: string, eleId: string, token?: CancellationToken): Promise<void>;
    nextScreen(token?: CancellationToken): Promise<void>;
    prevScreen(token?: CancellationToken): Promise<void>;
    nextSpineItem(token?: CancellationToken): Promise<void>;
    prevSpineItem(token?: CancellationToken): Promise<void>;
    ensureLoaded(token?: CancellationToken): Promise<void>;
    visibleSpineItemIndexRange(): number[];
    getSpineItemView(spineItemIndex: number): SpineItemView | undefined;
    getOffsetInSpineItemView(siIndex: number): number | undefined;
    onVisiblePagesReady(callback: (cv: IContentView) => void): void;
    getViewScale(siIndex: number): number;
    beginViewUpdate(): void;
    endViewUpdate(): void;
    private onLocationChanged;
    private init;
    private bindEvents;
    private ensureConentLoadedAtRange;
    private updatePrefetch;
    private updatePositions;
    private adjustScrollPosition;
    private render;
    private scrollOffset;
    private updateScrollFromViewOffset;
    private ensureViewportFilledAtPosition;
    private ensureContentLoadedAtSpineItemRange;
    private showOnlyCurrentSpineItemRange;
    private clipToVisibleRange;
    private getScaledViewportSize;
    private getEndOffset;
    private onPagesReady;
}
