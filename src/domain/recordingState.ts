import { fromPromise, Stream, zip } from "most";
import { CommandStreams } from "../domain/commands";
import { Config } from "./config";
import { buildMergeAuidoVideoCommand, execCommandIgnoreErrorSafe } from "./ffmpegCommands";
import * as Audio from "./recorders/audio";
import * as Video from "./recorders/video";

export type RecordingEvent =
    | { type: "RESULT"; payload: string }
    | { type: "ERROR"; payload: Error };

export function start(commands: CommandStreams, config: Config): Stream<RecordingEvent> {
    const videoResult$ = Video.singleRecorderInMemorySetup(commands, config.videoMediaStream);
    const audioResult$ = Audio.setup(commands, config.audioMediaStream);
    const videoAudio$ = zip((vT, aT) => aT.ap(vT.map(zipper)), videoResult$, audioResult$);
    const output$ = videoAudio$
        .map(pathsT => pathsT.chain(mergeAudoVideoFiles))
        .map(resT =>
            resT.fold<RecordingEvent>(
                err => ({ type: "ERROR", payload: err }),
                res => ({ type: "RESULT", payload: res })
            )
        )
        .chain(task => fromPromise(task.run()));

    return output$;
}

const mergeAudoVideoFiles = (paths: { audio: string; video: string }) =>
    execCommandIgnoreErrorSafe(buildMergeAuidoVideoCommand(paths.video, paths.audio));

const zipper = (video: string) => (audio: string) => ({ video, audio });
