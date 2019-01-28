export declare abstract class View {
    parent: View;
    abstract render(): void;
    abstract attachToHost(host: HTMLElement): void;
}
