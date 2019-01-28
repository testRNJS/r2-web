import { Link } from '@readium/shared-models/lib/models/publication/link';
import { SpineItemView } from './spine-item-view';
export declare class SpineItemViewMock extends SpineItemView {
    loadSpineItem(spineItem: Link): Promise<void>;
}
