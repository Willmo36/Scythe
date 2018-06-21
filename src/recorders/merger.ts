import { exec } from "child_process";
import { Task } from "fp-ts/lib/Task";
var ffmpegStatic = require("ffmpeg-static");
//node_modules/ffmpeg-static/bin/win32/x64/ffmpeg.exe -i recordings/video1.webm -i recordings/audio1.webm -acodec copy -vcodec copy OMG.mp4

export const buildFFMPEGMergeCommand = (vPath: string, aPath: string, oPath: string) =>
    `${ffmpegStatic.path} -i ${vPath} -i ${aPath} -acodec copy -vcodec copy -strict -2 ${oPath}`;

//ffmpeg reports into stdErr, so there's no point in handling rejection
export const execCommandIgnoreError = (cmd: string): Task<void> =>
    new Task(() => new Promise<void>(res => exec(cmd, () => res())));
