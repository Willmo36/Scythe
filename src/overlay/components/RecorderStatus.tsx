import * as React from "react";
import { RecordingEvent, showRecordingEvent } from "../../domain/recordingState";
import { Option } from "fp-ts/lib/Option";

export class RecorderStatus extends React.Component<
    { recordingEvent: Option<RecordingEvent> },
    {}
> {
    render() {
        const latestEvent = this.props.recordingEvent.fold("🎬", showRecordingEvent);
        return (
            <div style={{ width: 50 }}>
                <div id="drag" className="bg-indigo-darker" />
                <div className="font-sans text-grey-lighter bg-indigo-dark p-2 border-2 border-indigo-darker shadow-md">
                    <p>{latestEvent}</p>
                </div>
            </div>
        );
    }
}
