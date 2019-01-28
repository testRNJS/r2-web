import { Publication } from '../streamer';
import { Rendition } from './rendition';
export declare class ReadingSystem {
    private viewport;
    initRenderer(viewport: HTMLElement): void;
    openRendition(pub: Publication): Rendition;
}
