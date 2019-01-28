import { Publication } from '../streamer';
import { IContentViewFactory } from './views/content-view/content-view-factory';
import { ISettingEntry, ZoomOptions } from './views/types';
import { ViewSettings } from './views/view-settings';
import { Viewport } from './views/viewport';
export declare enum SpreadMode {
    Freeform = 0,
    FitViewportAuto = 1,
    FitViewportSingleSpread = 2,
    FitViewportDoubleSpread = 3
}
export interface PageLayoutSettings {
    spreadMode: SpreadMode;
    pageWidth?: number;
    pageHeight?: number;
}
export declare class Rendition {
    viewport: Viewport;
    private bookView;
    private pub;
    private pageWidth;
    private pageHeight;
    private spreadMode;
    private numOfPagesPerSpread;
    private contentViewFactory;
    private viewAsVertical;
    private vs;
    constructor(pub: Publication, viewport: HTMLElement, cvFactory: IContentViewFactory);
    reset(): void;
    setPageLayout(layoutSetting: PageLayoutSettings): void;
    refreshPageLayout(): void;
    updateViewSettings(settings: ISettingEntry[]): void;
    viewSettings(): ViewSettings;
    setZoom(option: ZoomOptions, scale: number): void;
    getZoomScale(): number;
    getZoomOption(): ZoomOptions;
    setViewAsVertical(v: boolean): void;
    getPageWidth(): number;
    getPublication(): Publication;
    getCfiFromAnchor(href: string, elementId: string): string | undefined;
    render(): Promise<void>;
    private initDefaultViewSettings;
    private setPageSize;
    private stringToSpreadMode;
}
