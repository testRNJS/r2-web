import { Link } from '@readium/shared-models/lib/models/publication/link';
import { IContentView, SelfResizeCallbackType } from './content-view/content-view';
import { IContentViewFactory } from './content-view/content-view-factory';
import { ViewSettings } from './view-settings';
import { CancellationToken, ZoomOptions } from './types';
import { View } from './view';
export declare enum ContentLoadingStatus {
    NotLoaded = 0,
    Loading = 1,
    Loaded = 2
}
export declare class SpineItemView extends View {
    protected host: HTMLElement;
    protected spine: Link[];
    protected cvFactory: IContentViewFactory;
    protected spineItem: Link;
    protected spineItemIndex: number;
    protected spineItemPageCount: number;
    protected isInUse: boolean;
    protected contentStatus: ContentLoadingStatus;
    protected isVertical: boolean;
    protected isFixedLayout: boolean;
    protected scaleOption: ZoomOptions;
    protected scale: number;
    protected contentHeight: number;
    protected contentView: IContentView;
    constructor(spine: Link[], isVertical: boolean, isFixedLayout: boolean, cvFactory: IContentViewFactory);
    getContentView(): IContentView;
    getOffsetFromCfi(cfi: string): number;
    getPageIndexOffsetFromCfi(cfi: string): number;
    getOffsetFromElementId(elementId: string): number;
    getPageIndexOffsetFromElementId(elementId: string): number;
    loadSpineItem(spineItem: Link, viewSettings: ViewSettings, token?: CancellationToken): Promise<void>;
    unloadSpineItem(): void;
    isSpineItemInUse(): boolean;
    fixedLayout(): boolean;
    ensureContentLoaded(token?: CancellationToken): Promise<void>;
    isContentLoaded(): boolean;
    resize(pageWidth: number, pageHeight: number): void;
    getScale(): number;
    setZoomOption(option: ZoomOptions): void;
    resizeFixedLayoutPage(option: ZoomOptions, pageWidth: number, pageHeight: number): void;
    setViewSettings(viewSetting: ViewSettings): void;
    render(): void;
    attachToHost(host: HTMLElement): void;
    getTotalPageCount(): number;
    setTotalPageCount(count: number): void;
    getTotalSize(pageWidth: number): number;
    getPageSize(pageWidth: number): number;
    getCfi(offsetMain: number, offset2nd: number, backward: boolean): string;
    getCfiFromElementId(elementId: string): string;
    onSelfResize(callback: SelfResizeCallbackType): void;
    show(): void;
    hide(): void;
    private onViewChanged;
    private updateScale;
}
