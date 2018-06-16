import { ipcRenderer } from "electron";
import { Stream, fromEvent } from "most";

export type CommandStreams = { captureStart$: Stream<string>; captureStop$: Stream<string> };

const captureStart$ = fromEvent("capture_start", ipcRenderer).map(() => ``);
const captureStop$ = captureStart$.chain(dir =>
    fromEvent("capture_stop", ipcRenderer).map(() => dir)
);

export const commands: CommandStreams = { captureStart$, captureStop$ };
