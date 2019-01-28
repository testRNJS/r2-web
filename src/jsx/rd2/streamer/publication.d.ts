import { Publication as ReadiumWebPub } from '@readium/shared-models/lib/models/publication/publication';
import { Link } from '@readium/shared-models/lib/models/publication/link';
import { Relation } from '@readium/shared-models/lib/models/publication/interfaces/link-core';
export declare class Publication extends ReadiumWebPub {
    readonly spine: Link[];
    private readonly sourceURI?;
    constructor(sourceURI?: string);
    static fromModel(publication: ReadiumWebPub, sourceURI?: string): Publication;
    static fromJSON(webPubManifestJSON: string, sourceURI?: string): Publication;
    static fromURL(publicationURL: string): Promise<Publication>;
    searchLinkByRel(rel: Relation): Link | undefined;
    getBaseURI(): string | undefined;
    getHrefRelativeToManifest(href: string): string;
    findSpineItemIndexByHref(href: string): number;
    isInternalHref(href: string): boolean;
}
