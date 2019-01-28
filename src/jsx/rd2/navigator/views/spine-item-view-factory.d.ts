import { Publication } from '../../streamer';
import { IContentViewFactory } from './content-view/content-view-factory';
import { SpineItemView } from './spine-item-view';
export declare class SpineItemViewFactory {
    private publication;
    private contentViewFactory;
    private isFixedLayout;
    private isVertical;
    constructor(pub: Publication, isFixedLayout: boolean, cvFactory: IContentViewFactory);
    setVerticalLayout(v: boolean): void;
    createSpineItemView(pageWidth: number, pageHeight: number): [SpineItemView, HTMLElement];
}
