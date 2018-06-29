import { exec } from "child_process";
import { Task } from "fp-ts/lib/Task";
import { buildOutputPath } from "../domain/pathBuilders";
var ffmpegStatic = require("ffmpeg-static");

export const buildMergeAuidoVideoCommand = (vPath: string, aPath: string) =>
    `${
        ffmpegStatic.path
    } -i ${vPath} -i ${aPath} -vcodec copy -acodec copy -strict -2 ${buildOutputPath()}`;

export const buildMergePartsCommand = (fullPath: string) => (paths: string[]) =>
    `${ffmpegStatic.path} -i "concat:${paths.join("|")}" ${fullPath}`;

//ffmpeg reports into stdErr, so there's no point in handling rejection
export const execCommandIgnoreError = (cmd: string): Task<string> =>
    new Task(() => new Promise<string>(res => exec(cmd, (err, stdout, stderr) => res(stderr))));
