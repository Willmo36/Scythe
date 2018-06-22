export const logWith = (msg: string, mode: string = "info") => <T>(d: T) => {
    (console as any)[mode](`${new Date().toLocaleTimeString()}: ${msg}`, d);
    return d;
};
