import { ISettingEntry, SettingName } from './types';
export declare class ViewSettings {
    private settings;
    getAllSettings(): ISettingEntry[];
    updateSetting(newSettings: ISettingEntry[]): void;
    updateView(view: HTMLElement): void;
    getSetting<T>(name: SettingName): T | undefined;
    getSettingWithDefaultValue<T>(name: SettingName, defaultVal: T): T;
    private setCss;
}
