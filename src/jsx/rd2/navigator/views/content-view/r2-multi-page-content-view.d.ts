import { ViewSettings } from '../view-settings';
import { R2ContentView } from './r2-content-view';
export declare class R2MultiPageContentView extends R2ContentView {
    private hostWidth;
    private hostHeight;
    render(): void;
    setViewSettings(viewSetting: ViewSettings): void;
    getOffsetFromCfi(cfi: string): number;
    getOffsetFromElementId(cfi: string): number;
    getPageIndexOffsetFromCfi(cfi: string): number;
    getPageIndexOffsetFromElementId(elementId: string): number;
    getCfi(offsetMain: number, offset2nd: number, backward: boolean): string;
    onResize(): void;
    protected onIframeLoaded(success: boolean): void;
    private paginate;
}
