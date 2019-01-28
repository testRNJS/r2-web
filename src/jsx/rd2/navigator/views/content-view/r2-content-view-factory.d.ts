import { IContentViewFactory } from './content-view-factory';
import { IFrameLoader } from '../../iframe-loader';
import { ElementBlacklistedChecker } from '../cfi/element-checker';
import { IContentView } from './content-view';
export declare class R2ContentViewFactory implements IContentViewFactory {
    private iframeLoader;
    private eleChecker;
    constructor(loader: IFrameLoader);
    setElementChecker(eleChecker: ElementBlacklistedChecker): void;
    createContentView(isFixedLayout: boolean, isVertical: boolean): IContentView;
}
