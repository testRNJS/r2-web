import { RenditionContext } from '../navigator/rendition-context';
declare type OnSizeUpdateCallback = () => void;
export declare class ViewportResizer {
    private rendCtx;
    private updateCallback;
    private resizeListener;
    private location;
    constructor(rendCtx: RenditionContext, updateCallback: OnSizeUpdateCallback);
    stopListenResize(): void;
    private registerResizeHandler;
    private handleViewportResizeStart;
    private handleViewportResizeTick;
    private handleViewportResizeEnd;
}
export {};
