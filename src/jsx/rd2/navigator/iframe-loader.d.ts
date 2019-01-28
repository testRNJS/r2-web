interface IR1AttachedDataType {
    spineItem: any;
}
interface ILoaderConfig {
    useReadiumCss?: boolean;
    useReadiumCssOverride?: boolean;
}
export declare class IFrameLoader {
    private publicationURI?;
    private isIE;
    private readiumCssBasePath?;
    private loaderEvents;
    constructor(publicationURI?: string);
    setReadiumCssBasePath(path: string): void;
    addIFrameLoadedListener(callback: Function): void;
    loadIframe(iframe: HTMLIFrameElement, src: string, callback: any, config: ILoaderConfig, attachedData: string | IR1AttachedDataType): void;
    private fetchContentDocument;
    private inject;
    private injectBaseHref;
    private injectReadiumCss;
    private injectReadiumGlue;
    private creatCssLink;
    private createJSElement;
    private iframeLoaded;
    private loadIframeWithDocument;
}
export {};
