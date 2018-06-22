import { Task, fromIO, task } from "fp-ts/lib/Task";
import { IO } from "fp-ts/lib/IO";
import { desktopCapturer } from "electron";
import { CommandStreams } from "../commands";
import * as LRU from "../LRU";
import { writeBlobTask } from "../blob";
import { buildVideoPath } from "./merger";
import { spy } from "fp-ts/lib/Trace";
import { fromNullable } from "fp-ts/lib/Option";

const getSources = new Task(
    () =>
        new Promise<Electron.DesktopCapturerSource[]>((res, rej) =>
            desktopCapturer.getSources(
                { types: ["window", "screen"] },
                (err, srcs) => (!!err ? rej : res(srcs))
            )
        )
);

const getVideoMedia = getSources.map(s => s[0]).chain(src => {
    const opts: any = {
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: "desktop",
                chromeMediaSourceId: src.id
            }
        }
    };

    return new Task(() => navigator.mediaDevices.getUserMedia(opts));
});

const createRecorder = (stream: MediaStream, onDataReady: (b: Blob) => void) => {
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
    recorder.ondataavailable = d => onDataReady(d.data);
    setTimeout(() => {
        recorder.stop();
    }, 15000);
    recorder.start();
};

const setupRecorders = (cmds: CommandStreams) =>
    getVideoMedia.chain(src =>
        fromIO(
            new IO(() => {
                let results: LRU.LRU<Blob> = LRU.create(15, []);

                //currying uggghhhh
                const addResult = (b: Blob) => {
                    results = LRU.insert(results, b);
                };

                setInterval(() => {
                    console.log("doing something", results.queue);
                    createRecorder(src, addResult);
                }, 1000);

                return cmds.captureStart$.map(() => fromNullable(results.queue[0])).tap(spy);
            })
        )
    );

export const setup = (evs: CommandStreams) =>
    setupRecorders(evs).map(blob$ =>
        blob$.map(blobOption => blobOption.map(writeBlobTask(buildVideoPath())))
    );

const emptyQueueTask = task.of("LRU empty");
