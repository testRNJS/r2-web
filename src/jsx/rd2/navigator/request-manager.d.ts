import { CancellationToken } from './views/types';
export declare class NavigationRequestManager {
    private cancelToken;
    startRequest(): CancellationToken;
    endRequest(cancelToken: CancellationToken): void;
    executeNavigationAction(navAction: (token: CancellationToken) => Promise<void>): Promise<void>;
}
