import { ipcRenderer } from "electron";
import { Stream, fromEvent, from } from "most";

export type CommandStreams = { captureStart$: Stream<string>; captureStop$: Stream<Event> };

const captureStart$ = fromEvent("capture_start", ipcRenderer)
    .map(() => Date.now().toString())
    .multicast();

const captureStop$ = fromEvent("capture_stop", ipcRenderer);

export const commands: CommandStreams = { captureStart$, captureStop$ };
