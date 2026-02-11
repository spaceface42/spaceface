export declare class Logger {
    constructor();
    log(level: 'debug' | 'info' | 'warn' | 'error' | 'event', scope: string, message: any): void;
}
export declare const logger: Logger;
