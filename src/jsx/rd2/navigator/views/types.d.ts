export declare enum ZoomOptions {
    FitByWidth = 0,
    FitByHeight = 1,
    FitByPage = 2
}
export declare class CancellationToken {
    isCancelled: boolean;
}
export declare enum SettingName {
    ColumnGap = "column-gap",
    MaxColumnWidth = "column-max",
    MinColumnWidth = "column-min",
    SpreadMode = "spread-mode",
    FontFamily = "font-family",
    FontSize = "font-size",
    ReadingMode = "reading-mode",
    TextColor = "text-color",
    BackgroundColor = "background-color",
    TextAlign = "text-align",
    FontOverride = "font-override"
}
export interface ISettingEntry {
    name: SettingName;
    value: any;
}
export declare function stringToSettingName(val: string): SettingName | undefined;
