import { exec } from "child_process";
import { Task } from "fp-ts/lib/Task";
import * as path from "path";
var ffmpegStatic = require("ffmpeg-static");
//node_modules/ffmpeg-static/bin/win32/x64/ffmpeg.exe -i recordings/video1.webm -i recordings/audio1.webm -acodec copy -vcodec copy OMG.mp4

const buildOutputPath = () =>
    path.join(process.cwd(), `/output/Scythe_${Date.now().toString()}.mp4`);

export const buildVideoPath = () =>
    path.join(process.cwd(), `/recording_tmp/video_${Date.now().toString()}.webm`);

export const buildVideoPartPath = (i: number) =>
    path.join(process.cwd(), `/recording_tmp/video_part_${i}_${Date.now().toString()}.webm`);

export const buildFFMPEGMergeAudioVideoCommand = (vPath: string, aPath: string) =>
    `${
        ffmpegStatic.path
    } -i ${vPath} -i ${aPath} -acodec copy -vcodec copy -strict -2 ${buildOutputPath()}`;

export const buildMergePartsCommand = (fullPath: string) => (paths: string[]) =>
    `${ffmpegStatic.path} -i "concat:${paths.join("|")}" ${fullPath}`;

//ffmpeg reports into stdErr, so there's no point in handling rejection
export const execCommandIgnoreError = (cmd: string): Task<void> =>
    new Task(() => new Promise<void>(res => exec(cmd, () => res())));
