export declare class Location {
    private cfi;
    private href;
    private isPrecise;
    constructor(cfi: string, href: string, isPrecise?: boolean);
    getLocation(): string;
    getHref(): string;
    getLocationPrecision(): boolean;
}
