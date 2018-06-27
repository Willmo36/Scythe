import { Stream, fromPromise } from "most";
import { Config } from "./config";
import * as Audio from "../recorders/audio";
import * as Video from "../recorders/video2";
import { CommandStreams } from "../commands";
import { zipTaskStreams } from "../utils/task";
import { execCommandIgnoreError, buildFFMPEGMergeAudioVideoCommand } from "../recorders/merger";

export type RecordingEvent = { type: "RESULT"; payload: string };

export function start(commands: CommandStreams, config: Config): Stream<RecordingEvent> {
    const videoResult$ = Video.setup2(commands, config.videoMediaStream);
    const audioResult$ = Audio.setup2(commands, config.audioMediaStream);
    const videoAudio$ = zipTaskStreams(videoResult$, audioResult$, mergeAudioVideoPaths);
    const output$ = videoAudio$
        .map(pathsT => pathsT.chain(mergeAudoVideoFiles))
        .chain(task => fromPromise(task.run()))
        .map<RecordingEvent>(res => ({ type: "RESULT", payload: res }));

    return output$;
}

const mergeAudioVideoPaths = (video: string) => (audio: string) => ({ audio, video });

const mergeAudoVideoFiles = (paths: { audio: string; video: string }) =>
    execCommandIgnoreError(buildFFMPEGMergeAudioVideoCommand(paths.video, paths.audio));
