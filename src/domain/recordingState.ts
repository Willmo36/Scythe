import { fromPromise, Stream } from "most";
import { CommandStreams } from "../domain/commands";
import { buildMergeAuidoVideoCommand, execCommandIgnoreError } from "./ffmpegCommands";
import { zipTaskStreams } from "../utils/task";
import { Config } from "./config";
import * as Audio from "./recorders/audio";
import * as Video from "./recorders/video";

export type RecordingEvent = { type: "RESULT"; payload: string };

export function start(commands: CommandStreams, config: Config): Stream<RecordingEvent> {
    const videoResult$ = Video.singleRecorderInMemorySetup(commands, config.videoMediaStream);
    const audioResult$ = Audio.setup(commands, config.audioMediaStream);
    const videoAudio$ = zipTaskStreams(
        video => audio => ({
            video,
            audio
        }),
        videoResult$,
        audioResult$
    );
    const output$ = videoAudio$
        .map(pathsT => pathsT.chain(mergeAudoVideoFiles))
        .chain(task => fromPromise(task.run()))
        .map<RecordingEvent>(res => ({ type: "RESULT", payload: res }));

    return output$;
}

const mergeAudoVideoFiles = (paths: { audio: string; video: string }) =>
    execCommandIgnoreError(buildMergeAuidoVideoCommand(paths.video, paths.audio));
