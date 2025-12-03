import gc from "@sg/game-client-base";
import { _decorator, Label, Node } from "cc";
import Observer from "observer";

import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import { formatCurrencyWithConfig } from "db://shared-components/shared/utils";
import { CrashUtils } from "../../../crash-utils";
import { TopWinItem } from "../../../handlers/api-client/top-result-client";
import { TopWinHandlers } from "../../../handlers/crash-v2";

const { property, ccclass } = _decorator;
const { FormatUtils } = gc;
const { handle } = Observer;

export type BetResultHistoryBodyItemType = {
    betHistoryLog: gc.BetHistory.BetHistoryLog;
    index: number;
    betKey: number;
    fractionalOddsFormat?: boolean;
};

@ccclass
export default class TopWinsBodyItem extends ObserverComponent {
    @property(Label)
    lblPlayer: Label = null;

    @property(Label)
    lblTotalStake: Label = null;

    @property(Label)
    lblMultiplier: Label = null;

    @property(Label)
    lblWin: Label = null;

    @property(Node)
    nodeBackground: Node = null;

    private roundId: number;

    setData(index: number, item: TopWinItem) {
        this.nodeBackground.active = index % 2 > 0;

        this.lblPlayer && (this.lblPlayer.string = CrashUtils.encryptedName(item.name));
        this.lblWin && (this.lblWin.string = formatCurrencyWithConfig(item.winAmount));
        this.lblTotalStake && (this.lblTotalStake.string = formatCurrencyWithConfig(item.betAmount));

        this.lblMultiplier.string = `${FormatUtils.numberWithCommas(+item.cashoutPoint, 2, false)}x`;
        this.lblMultiplier.color = CrashUtils.getMultiplierColor(item.cashoutPoint);

        this.roundId = item.roundId;
    }

    @handle(gc.Audios.AudioHandler, (handle, id: string) => handle.playSFX(id))
    playSoundClick() {
        return gc.Audios.AudioIds.CLICK;
    }

    @handle(TopWinHandlers, (handle, roundId: number) => handle.openVerificationHistory(roundId))
    onClickVerify() {
        this.playSoundClick();
        return this.roundId;
    }
}
