# Scythe - Commentate over screen recordings

The goal of Scythe was to be able to capture the last N seconds of a screen/app and add audio commentary over the top. The source idea was to improve my Overwatch play by capturing my deaths and laying on top my thoughts for a more immediate game-play review.

It's written using Electron, TypeScript and FFMPEG, designed to be an overlay widget, similar to [Discord's overlay](https://support.discordapp.com/hc/en-us/articles/217659737-Games-Overlay-101)

This is not a "working product". It _sort of works_ but is extremely resource intensive (not for classic electron reasons).

I've not packaged this up but you can run it locally.

1.  `yarn install`
2.  `yarn run start`

# Stack

-   [Electron](https://electronjs.org/)
-   [TypeScript](https://www.typescriptlang.org/)
-   [FFMPEG](https://www.ffmpeg.org/)
-   [fp-ts](https://github.com/gcanti/fp-ts/)
-   [most](https://github.com/cujojs/most)
-   [React](https://reactjs.org/)

# [Screen recording](/src/domain/recorders/video.ts)

The screen recorder needs to be "always on", keeping the last N seconds in memory such that those seconds are readily available on command, like the [PlayStation share clip](http://manuals.playstation.net/document/gb/ps4/share/videoclip.html). All my attempts revolve around the use of the [MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder) API. An instance of `MediaRecorder` takes a `MediaStream` and records it into `webM` file in the form of a `Blob` (or several as we'll see).

### Attempt 1

Start up a `MediaRecorder`, setting it to output a `Blob` of recording once a second. This `Blob` is pushed onto an LRU queue with a fixed size of N (N \* 1s = Ns of recording). When requested, the contents of the queue was stitched together by `Blob` concatenation then saved to disk.

**Result**; Corrupted `webM` files mostly. The very first `Blob` output of a `MediaRecorder` contains metadata required to form a valid `webM` file. So once the app had ran for N + 1s (so the first `Blob` had been evicted from the cache) the output was a `webM` file with no metadata. VLC could kinda of play it but with very weird behaviour.

**Improvements**; If I could figure out how to manually create the metadata for a `webM` _and_ stitch it in front of the `Blob`s in memory, this might of worked.

### Attempt 2

Another single instance of `MediaRecorder` but this time saving each `Blob` as an individual `webM` file and using `FFMPEG` to stitch them together.

**Result**; Due to the missing metadata in each `Blob`, FFMPEG would fail with an "invalid data" error.

**Improvements**; Again the metadata, though if that was solved, attempt 1 would be a better solution still.

### Attempt 3

Multiple instances of `MediaRecorder`. Start a new recorder every second and stop it after N seconds. Maintain a `latestBlob` variable which each recorder overrides. This attempt was to make sure I had the metadata in each `Blob` but it was to be much more expensive (N^2 frames in memory).

**Result**; This worked... when recording basic apps like VS Code or Chrome. I booted up Overwatch, started recording and oh my. The process went up to 88% CPU usage and my laptop went into meltdown. Everything would come to a halt before more than a second of recording could take place so there was no output. This was with a very low N of 5-15. I also played with the recording dimensions and frame rate.

**Improvements**; This was just a very inefficient way of doing it but it's also the closest I got. I'm not sure what else I can try here.

### Attempt 4

Take 30 screenshots every second, pass them to FFMPEG to stitch together as a video.

**Result**; Didn't even get to the FFMPEG part. Within 5 seconds I'd created 142mb of images. That number went down with tweaks but wasn't sustainable for say, an N of 30.

**Improvments**; This was a pretty lame attempt I'll admit. I could probably keep a lot of images in memory and batch save to disk (I'm using FFMPEG via the command line).

### Attempt 5

Back to a single instance of `MediaRecorder` but this time try to create the metadata. I created a "head `Blob`" but starting and quickly stopping another `MediaRecorder` before starting the main one. Then on stitching (like attempt 1) I'd pop this head `Blob` in front. I also tried creating the head `Blob` at the point of capture too.

**Result**; This created a valid `webM` but the metadata was seriously messed up. A 5s clip would be actually be 17s long with the first 12s being (I assume) the frame in the head `Blob`.

**Improvements**; Being able to create valid metadata is a recurring theme. Again if this was solved, attempt 1 would be better.

### Non-Electron attempts

Screen recording is a solved problem in other platforms. Windows provides an API with per-frame callback and NVIDIA also have an SDK for some of their GPUs. If I'm to come back to this I'd try the Windows API next using cross process comms to talk to the electron app (which would just become a UI tbh).

Or maybe I've missed something in my attempts. Maybe there is a different set of config for the `MediaRecorder` or a different recording API entirely.

## Other highlights

Despite the recording failing there are other little bits in this project I'm quite pleased with.

**`fp-ts`**; This is my first usage of `fp-ts` and I very much enjoyed it, having HKTs in TypeScript is a joy. A number of the platfrom methods around video/audio are asynchronous and can fail. [`fp-ts/TaskEither`](https://github.com/gcanti/fp-ts/blob/master/src/TaskEither.ts) was a wonderful abstraction over these concepts, especially once I discovered the [`tryCatch`](https://github.com/gcanti/fp-ts/blob/master/src/TaskEither.ts#L181) function.

**Validation**; I'm also fond of the form validation in [config.ts](/src/domain/config.ts) (it could do with a large refactor) which combines applicative validation with TypeScript's annoymous type equality to produce nice compile time guarantees. For example, in `tryBuildConfig`, if I forget to add a validator for a form property then the anonymous type won't be equal to the resultant type (by missing the property) and will not compile.

**`most`**; The application is stateful with a fair amount of async and events flying around. I used a flux-like architecture via `most` to orchestrate this. Inspired by [redux-observable](https://github.com/redux-observable/redux-observable), I used `Stream`s to chain the [async handling](/src/overlay/handlers).
