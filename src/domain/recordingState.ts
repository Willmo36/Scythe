import { fromPromise, Stream, zip, merge } from "most";
import { CommandStreams } from "../domain/commands";
import { Config } from "./config";
import { buildMergeAuidoVideoCommand, execCommandIgnoreErrorSafe } from "./ffmpegCommands";
import * as Audio from "./recorders/audio";
import * as Video from "./recorders/video";
import { constant } from "fp-ts/lib/function";

export type RecordingEvent =
    | { type: "CAPTURE_START" }
    | { type: "CAPTURE_COMPLETE"; payload: string }
    | { type: "ERROR"; payload: Error };

export function start(commands: CommandStreams, config: Config): Stream<RecordingEvent> {
    const videoResult$ = Video.singleRecorderInMemorySetup(commands, config.videoMediaStream);
    const audioResult$ = Audio.setup(commands, config.audioMediaStream);
    const videoAudio$ = zip((vT, aT) => aT.ap(vT.map(zipper)), videoResult$, audioResult$);
    const mergeVideoAudioResult$ = videoAudio$
        .map(pathsT => pathsT.chain(mergeAudoVideoFiles))
        .chain(task => fromPromise(task.run()));

    const recordingEvent$ = merge<RecordingEvent>(
        commands.captureStart$.map(captureStartRecordingEvent),
        mergeVideoAudioResult$.map(resT =>
            resT.fold<RecordingEvent>(
                err => ({ type: "ERROR", payload: err }),
                res => ({ type: "CAPTURE_COMPLETE", payload: res })
            )
        )
    );

    return recordingEvent$;
}

const mergeAudoVideoFiles = (paths: { audio: string; video: string }) =>
    execCommandIgnoreErrorSafe(buildMergeAuidoVideoCommand(paths.video, paths.audio));

const zipper = (video: string) => (audio: string) => ({ video, audio });
const captureStartRecordingEvent = constant<RecordingEvent>({ type: "CAPTURE_START" });
