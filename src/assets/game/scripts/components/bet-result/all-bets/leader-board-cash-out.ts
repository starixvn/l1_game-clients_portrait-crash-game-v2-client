import gc from "@sg/game-client-base";
import { _decorator, Component, Label, Node } from "cc";
import { formatCurrencyWithConfig } from "db://shared-components/shared/utils";
import { CrashUtils } from "../../../crash-utils";

const { ccclass, property } = _decorator;
const { FormatUtils } = gc;

interface ILeaderBoardCashOutData {
    name: string;
    amount: number;
    multiplier?: number;
    win?: number;
}

@ccclass
export class LeaderBoardCashOut extends Component {
    @property(Label)
    lblName: Label = null;

    @property(Label)
    lblMultiplier: Label = null;

    @property(Label)
    lblWin: Label = null;

    @property(Label)
    lblBetAmount: Label = null;

    @property(Node)
    nodeBackground: Node = null;

    setData(data: ILeaderBoardCashOutData, index: number) {
        this.nodeBackground.active = index % 2 > 0;
        const { name, multiplier, win, amount } = data;
        this.lblName.string = CrashUtils.encryptedName(name);
        this.lblBetAmount.string = formatCurrencyWithConfig(amount);
        const hasCashedOut = multiplier > 0;
        this.lblMultiplier.string = hasCashedOut ? `${FormatUtils.numberWithCommas(multiplier, 2, false)}x` : "-";
        this.lblWin.string = hasCashedOut ? formatCurrencyWithConfig(win) : "-";
    }
}
