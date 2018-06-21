import { Task } from "fp-ts/lib/Task";
import { TaskEither, right } from "fp-ts/lib/TaskEither";
import { fromNullable } from "fp-ts/lib/Either";
import { create } from "@most/create";
import { CommandStreams } from "../commands";
import { Stream } from "most";
import { writeBlobs } from "../blob";

type RecorderSetup = (streams: CommandStreams) => (ms: MediaStream) => Stream<Blob[]>;

const getAllAudioInfo = new Task(() => navigator.mediaDevices.enumerateDevices());
const getAudioInfo = new TaskEither<String, MediaDeviceInfo>(
    getAllAudioInfo
        .map(ds => ds.find(d => d.kind === "audioinput"))
        .map(fromNullable("No audio device info found"))
);

const getAudioMedia = (info: MediaDeviceInfo) =>
    new Task(() => navigator.mediaDevices.getUserMedia({ audio: { deviceId: info.deviceId } }));

export const tryGetAudioMedia = getAudioInfo.map(getAudioMedia).chain(right);

export const setupAudioRecording: RecorderSetup = commands => stream => {
    const recorder = new MediaRecorder(stream, {
        bitsPerSecond: 100000,
        mimeType: "audio/webm;codecs=opus"
    });

    const dataAvailable$ = create<Blob[]>((add, end) => {
        recorder.ondataavailable = d => {
            const b = new Blob([d.data], { type: "audio/webm" });
            add([b]);
            end();
        };
    });

    return commands.captureStart$
        .tap(() => recorder.start())
        .chain(() => commands.captureStop$.tap(() => recorder.stop()))
        .chain(() => dataAvailable$);
};

export const setup = (cmds: CommandStreams) =>
    tryGetAudioMedia
        .fold(warn, setupAudioRecording(cmds))
        .map(blobs$ => blobs$.map(writeBlobs("webm")));

const warn = console.warn.bind(console);
