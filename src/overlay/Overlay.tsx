import { Component, h, render } from "preact";
import { RecordState } from "../domain/RecordState";

export type OverlayProps = { state: RecordState };
export class Overlay extends Component<OverlayProps> {
    render(props: OverlayProps) {
        return <div>{props.state.toString()}</div>;
    }
}
