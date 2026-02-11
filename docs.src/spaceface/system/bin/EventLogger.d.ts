export declare const VERSION: "2.0.0";
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'event';
export interface LogEntry {
    level: LogLevel;
    scope: string;
    message: string;
    data?: any;
    time: number;
}
export declare class EventLogger {
    private scope;
    private devMode;
    private fallbackLogs;
    constructor(scope: string, devMode?: boolean);
    private shouldLog;
    private log;
    private consoleOutput;
    getFallbackLogs(): LogEntry[];
    debug(msg: string, data?: any): void;
    info(msg: string, data?: any): void;
    warn(msg: string, data?: any): void;
    event(msg: string, data?: any): void;
    error(msg: string, data?: any): void;
}
