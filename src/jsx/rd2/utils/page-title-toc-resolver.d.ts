import { Location } from '../navigator/location';
import { Rendition } from '../navigator/rendition';
import { Link } from '@readium/shared-models/lib/models/publication/link';
export declare class PageTitleTocResolver {
    private pub;
    private rendition;
    private pageListMap;
    private tocMap;
    constructor(rend: Rendition);
    getPageTitleFromLocation(loc: Location): string;
    getTocLinkFromLocation(loc: Location): Link | null;
    private findMatchLink;
    private ensureSpineItemPageListMap;
    private ensureSpineItemTocMap;
    private processTocLink;
    private tryCreateLinkLocationInfo;
    private getHrefAndElementId;
}
