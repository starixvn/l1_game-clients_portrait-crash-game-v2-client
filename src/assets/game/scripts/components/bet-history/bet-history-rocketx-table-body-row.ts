import gc from "@sg/game-client-base";
import { _decorator, Label, Node } from "cc";
import Observer from "observer";

import { DynamicObject } from "@sg/game-client-base/dist/game/bet-history";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import { formatCurrencyWithConfig } from "db://shared-components/shared/utils";
import { CrashUtils } from "../../crash-utils";
import { HistoryConstants } from "../../handlers/crash-v2";
import { BetWinCell } from "./bet-win-cell";
const { property, ccclass } = _decorator;
const { DateTimeUtils, FormatUtils } = gc;
const { handle } = Observer;

export type BetResultHistoryBodyItemType = {
    betHistoryLog: gc.BetHistory.BetHistoryLog;
    index: number;
    betKey: number;
    fractionalOddsFormat?: boolean;
};

@ccclass
export default class BetHistoryRocketXTableBodyRow extends ObserverComponent {
    @property(Label)
    lblDate: Label = null;

    @property(Label)
    lblTime: Label = null;

    @property(Label)
    lblRound: Label = null;

    @property(Label)
    lblTotalStake: Label = null;

    @property(Label)
    lblMultiplier: Label = null;

    @property(Label)
    lblRefund: Label = null;

    @property(Node)
    nodeBackground: Node = null;

    @property(Label)
    lblResult: Label = null;

    @property(Node)
    betWinCell: Node = null;

    betHistoryLog: gc.BetHistory.BetHistoryLog = null;

    setData(data: BetResultHistoryBodyItemType) {
        const { betHistoryLog, index, betKey } = data;
        this.betHistoryLog = betHistoryLog;
        this.nodeBackground.active = index % 2 > 0;

        const betTime = this.getBetTime(betHistoryLog, betKey);
        this.setLabels(betTime, betHistoryLog, betKey);
    }

    private getBetTime(betHistoryLog: gc.BetHistory.BetHistoryLog, betKey: number): string {
        return betHistoryLog.betLogDetails.find((element) => this.isBetRowData(element, betKey.toString()))?.time.toString();
    }

    private setLabels(betTime: string, betHistoryLog: gc.BetHistory.BetHistoryLog, betKey: number) {
        if (this.lblDate) {
            this.lblDate.string = DateTimeUtils.getStringDate(betTime);
        }
        if (this.lblTime) {
            this.lblTime.string = DateTimeUtils.getStringHourByTime(betTime);
        }
        this.lblRound.string = betHistoryLog.roundId.toString();

        const betAmount = this.getBetAmount(betHistoryLog, betKey);
        if (this.lblTotalStake) {
            this.lblTotalStake.string = formatCurrencyWithConfig(betAmount);
        }

        this.bindMultiplier(betHistoryLog, betKey);
        this.bindWin(betHistoryLog, betKey);
    }

    private getBetAmount(betHistoryLog: gc.BetHistory.BetHistoryLog, betKey: number): number {
        const betDetail = betHistoryLog.betLogDetails.find((element) => this.isBetRowData(element, betKey.toString()));
        return betDetail === undefined ? 0 : Number(betDetail.amount);
    }

    private bindMultiplier(betHistoryLog: gc.BetHistory.BetHistoryLog, betKey: number) {
        const multiplierRow = betHistoryLog.betLogDetails.find((element) => this.isSettledData(element, betKey.toString()));
        const defaultMultiplierText = "-";

        if (!multiplierRow) {
            this.lblMultiplier.string = defaultMultiplierText;
            return;
        }

        const isRefund = multiplierRow.action.toString() === CrashUtils.betEventNames.refund;
        if (isRefund) {
            this.lblRefund.node.active = true;
            this.lblMultiplier.node.active = false;
            return;
        }

        const multiplier = Number(multiplierRow.multiplier);
        const multiplierText = multiplier !== 0 
            ? `${FormatUtils.numberWithCommas(multiplier, 2, false)}x`
            : defaultMultiplierText;
            
        this.lblMultiplier.string = multiplierText;
    }

    private bindWin(betHistoryLog: gc.BetHistory.BetHistoryLog, betKey: number) {
        const betCashOut = betHistoryLog.betLogDetails.find((element) => this.isSettledData(element, betKey.toString()));

        const isReachMaxWin = Boolean(betCashOut?.reachMaxWin);
        const betwin = betCashOut === undefined ? 0 : Number(betCashOut.winAmount);
        const win = formatCurrencyWithConfig(betwin);

        this.betWinCell.getComponent(BetWinCell)?.setData(win, isReachMaxWin);
        if (isReachMaxWin) {
            this.setupEventListeners();
        }
    }

    isBetRowData(betDetail: DynamicObject<object>, betKey: string): boolean {
        const actionName = betDetail.action.toString();
        return actionName === gc.GameClientEmitMessage.Bet.eventName.toString() && betDetail.betKey.toString() === betKey;
    }

    isSettledData(betDetail: DynamicObject<object>, betKey: string): boolean {
        const actionName = betDetail.action.toString();
        return (
            (actionName === CrashUtils.betEventNames.cashOut || actionName === CrashUtils.betEventNames.refund) &&
            betDetail.betKey.toString() === betKey
        );
    }

    @handle(gc.Audios.AudioHandler, (handle, id: string) => handle.playSFX(id))
    playSoundClick() {
        return gc.Audios.AudioIds.CLICK;
    }

    @handle(gc.GameCrash.ProvablyFair.ProvablyFairHandler, (handle, roundId: number) => handle.openVerificationHistory(roundId))
    onClickVerify() {
        this.playSoundClick();
        return this.betHistoryLog.roundId;
    }

    onLoad() {
        super.onLoad();
    }

    private setupEventListeners() {
        this.betWinCell.on(Node.EventType.MOUSE_ENTER, this.triggerHoverMaxReachCallback, this);
        this.betWinCell.on(Node.EventType.MOUSE_LEAVE, this.triggerExitHoverMaxReachCallback, this);
        this.betWinCell.on(Node.EventType.TOUCH_START, this.triggerHoverMaxReachCallback, this);
        this.betWinCell.on(Node.EventType.TOUCH_END, this.triggerTouchEndMaxReachCallback, this);
    }

    triggerHoverMaxReachCallback() {
        this.node.emit(HistoryConstants.hoverTriggerParent, this.node);
    }

    triggerExitHoverMaxReachCallback() {
        this.node.emit(HistoryConstants.exitHoverTriggerParent, this.node);
    }

    triggerTouchEndMaxReachCallback() {
        setTimeout(() => {
            this.triggerExitHoverMaxReachCallback();
        }, 2000);
    }
}
