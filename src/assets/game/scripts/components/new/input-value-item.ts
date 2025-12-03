import { _decorator, Component, Label } from "cc";
import { formatCurrencyWithConfig } from "db://shared-components/shared/utils";
const { ccclass } = _decorator;

@ccclass("InputValueItem")
export class InputValueItem extends Component {
    label: Label = null;

    fetchLabel() {
        this.label = this.getComponentInChildren(Label);
    }

    setValue(value: number) {
        if (!this.label) {
            this.fetchLabel();
        }
        this.label.string = formatCurrencyWithConfig(value);
    }
}
