import { IFrameLoader } from './iframe-loader';
import { Navigator } from './navigator';
import { Rendition } from './rendition';
import { NavigationRequestManager } from './request-manager';
export declare class RenditionContext {
    requestManager: NavigationRequestManager;
    rendition: Rendition;
    navigator: Navigator;
    private iframeLoader;
    private glueManager;
    constructor(rendition: Rendition, iframeLoader: IFrameLoader);
}
