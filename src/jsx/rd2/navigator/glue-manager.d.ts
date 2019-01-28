import { IFrameLoader } from './iframe-loader';
import { RenditionContext } from './rendition-context';
export declare class GlueManager {
    private iframeLoader;
    private handlers;
    private navigator;
    private publication;
    private frameIDToGlueMap;
    private frameID;
    constructor(context: RenditionContext, iframeLoader: IFrameLoader);
    private initializeGlueModules;
    private addGlueHandler;
    private addToHandlersMap;
    private destroyHandler;
    private handleLink;
    private handleLinkHref;
    private handleSelection;
    private getGlueModule;
    private getFrameID;
}
