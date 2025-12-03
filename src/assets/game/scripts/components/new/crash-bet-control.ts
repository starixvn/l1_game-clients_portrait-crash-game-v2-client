import gc from "@sg/game-client-base";
import { _decorator, Button, EditBox, Label, Node, Toggle, warn } from "cc";
import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import { ToggleNode } from "db://shared-components/shared/common-components/toggle-node";
import { formatCurrencyWithConfig } from "db://shared-components/shared/utils";
import Observer from "observer";
import { AudioIds } from "../../../audios/AudioIds";
import { BetControlStore } from "../../handlers/crash-v2/bet/bet-control-store";
import { ButtonState, IBetControlSettings } from "../../handlers/crash-v2/interfaces";
import { CrashBetHandler } from "../../handlers/override/crash-bet-handler";
import { InputValueItem } from "./input-value-item";

const { ccclass, property } = _decorator;
const { render, handle } = Observer;

@ccclass("CrashBetControl")
export default class CrashBetControl extends ObserverComponent {
    @property(Toggle)
    toggleAutoBet: Toggle = null;

    @property(Toggle)
    toggleAutoCashOut: Toggle = null;

    @property(EditBox)
    inputBetAmount: EditBox = null;

    @property(EditBox)
    inputCashOutAt: EditBox = null;

    @property(Node)
    nodePlaceBet: Node = null;

    @property(Node)
    nodeAcceptedBet: Node = null;

    @property(Node)
    nodeCashOut: Node = null;

    @property(Node)
    nodeBetNextRound: Node = null;

    @property(Node)
    nodeWaitingNextRound: Node = null;

    @property(Label)
    labelCashOutValue: Label = null;

    @property(Label)
    labelBetValue: Label = null;

    @property(Node)
    nodeInputValues: Node = null;

    @property(Node)
    nodePreventInput: Node = null;

    @property(Button)
    btnDecreaseBet: Button = null;

    @property(Button)
    btnIncreaseBet: Button = null;

    betKey = 0;

    private _btnCashOut: Button = null;

    get btnCashOut() {
        if (!this._btnCashOut) {
            this._btnCashOut = this.nodeCashOut.getComponent(Button);
        }
        return this._btnCashOut;
    }

    private _btnBet: Button = null;

    get btnBet() {
        if (!this._btnBet) {
            this._btnBet = this.nodePlaceBet.parent.getComponent(Button);
        }
        return this._btnBet;
    }

    private disableInput = false;

    @handle(gc.Audios.AudioHandler, (handler, id: string) => handler.playSFX(id))
    playSFX(audioId: string) {
        return audioId;
    }

    @handle(CrashBetHandler, (handler, betKey: number) => handler.callBet(betKey))
    onClickBet() {
        this.playSFX(AudioIds.PLACE_BET);
        return this.betKey;
    }

    @handle(CrashBetHandler, (handler, betKey: number) => handler.callCashOut(betKey))
    onClickCashOut() {
        this.playSFX(AudioIds.WITHDRAW);
        return this.betKey;
    }

    @handle(CrashBetHandler, (handler, betKey: number) => handler.enableEarlyBet(betKey))
    onClickBetNextRound() {
        this.playSFX(AudioIds.CLICK);
        return this.betKey;
    }

    @handle(CrashBetHandler, (handler, betKey: number) => handler.cancelEarlyBet(betKey))
    onClickCancelEarlyBet() {
        this.playSFX(AudioIds.CANCEL_BET);
        return this.betKey;
    }

    @handle(CrashBetHandler, (handler, betKey: number) => handler.toggleAutoBet(betKey))
    onToggleAutoBet() {
        this.playSFX(AudioIds.CLICK);
        return this.betKey;
    }

    @handle(BetControlStore, (handler, betKey: number) => handler.toggleAutoCashOut(betKey))
    onToggleAutoCashOut() {
        this.playSFX(AudioIds.CLICK);
        return this.betKey;
    }

    renderBetState(state: string) {
        this.nodeCashOut.active = state === ButtonState.CASH_OUT;

        this.nodeAcceptedBet.active = state === ButtonState.BET_ACCEPTED;
        this.nodePlaceBet.active = state === ButtonState.PLACE_BET;
        this.btnBet.node.active = this.nodePlaceBet.active || this.nodeAcceptedBet.active;

        this.nodeBetNextRound.active = state === ButtonState.BET_NEXT_ROUND;
        this.nodeWaitingNextRound.active = state === ButtonState.CANCEL_BET;
        this.nodeBetNextRound.parent.active = this.nodeWaitingNextRound.active || this.nodeBetNextRound.active;

        this.disableInput = state === ButtonState.CANCEL_BET || state === ButtonState.BET_ACCEPTED || state === ButtonState.CASH_OUT;
        this.updatePreventInput();
    }

    updatePreventInput() {
        const disableInput = this.toggleAutoBet.isChecked || this.disableInput;
        this.nodePreventInput.active = disableInput;

        this.inputCashOutAt.enabled = !disableInput;
        this.inputBetAmount.enabled = !disableInput;
    }

    renderSetting(setting: IBetControlSettings) {
        this.toggleAutoBet.setIsCheckedWithoutNotify(setting.autoBet);
        this.toggleAutoCashOut.setIsCheckedWithoutNotify(setting.autoCashOut);
        this.updateToggleNodes();
        this.updatePreventInput();

        const betValue = formatCurrencyWithConfig(setting.amount);
        this.inputBetAmount.string = betValue;
        this.labelBetValue.string = betValue;
        this.inputBetAmount.placeholder = betValue;
        this.inputCashOutAt.string = `${gc.FormatUtils.numberWithCommas(setting.cashOutAt, 2, false)}x`;
        this.inputCashOutAt.placeholder = this.inputCashOutAt.string;
    }

    private updateToggleNodes() {
        [this.toggleAutoBet, this.toggleAutoCashOut].forEach((toggle) => {
            const toggleNode = toggle.getComponent(ToggleNode);
            toggleNode.updateDisplay();
        });
    }

    onLoad() {
        this.inputBetAmount.node.on(EditBox.EventType.EDITING_DID_ENDED, this.onEditEndBetAmount, this);
        this.inputBetAmount.node.on(EditBox.EventType.EDITING_DID_BEGAN, this.onEditBegin, this);
        this.inputCashOutAt.node.on(EditBox.EventType.EDITING_DID_ENDED, this.onEditEndCashOutAt, this);
        this.inputCashOutAt.node.on(EditBox.EventType.EDITING_DID_BEGAN, this.onEditBegin, this);

        this.nodeInputValues.children.forEach((child, index) => {
            child.on(Button.EventType.CLICK, () => {
                this.onClickInputValue(index);
            });
        });
        super.onLoad();
    }

    setDisableCashOut(disable: boolean) {
        this.btnCashOut.interactable = !disable;
    }

    onEditBegin(editBox: EditBox) {
        const text = editBox.string;
        const cleanText = text.replace(/,/g, "").replace(/x/g, "");
        const numValue = Number(cleanText);
        editBox.string = numValue.toString();
        editBox.placeholder = numValue.toString();
    }

    onEditEndBetAmount(editBox: EditBox) {
        const validValue = this.onEditEnd(editBox, false);
        this.setValidBetAmount(Number(validValue));
    }

    onEditEndCashOutAt(editBox: EditBox) {
        const validValue = this.onEditEnd(editBox, false);
        this.setValidCashOutAt(Number(validValue));
    }

    onEditEnd(editBox: EditBox, noZero: boolean) {
        try {
            let value = Number(editBox.string);
            if (isNaN(value)) {
                value = 1;
            }
            const valueString = gc.FormatUtils.numberWithCommas(value, 2, noZero);
            const validValue = valueString.replace(/,/g, "").replace(/x/g, "");
            return Number(validValue);
        } catch (error) {
            warn("input edit box error ----------------- ", editBox.string);
            return 1;
        }
    }

    @render(gc.Rounds.RoundTimeStore, (store) => store.isLocking)
    renderLockingBet(isLocking: boolean) {
        this.btnBet.interactable = !isLocking;
    }

    @handle(BetControlStore, (handler, data: { betKey: number; amount: number }) => handler.setValidBetAmount(data.betKey, data.amount))
    setValidBetAmount(value: number) {
        return {
            betKey: this.betKey,
            amount: value,
        };
    }

    @handle(BetControlStore, (handler, data: { betKey: number; cashOutAt: number }) =>
        handler.setValidCashOutAt(data.betKey, data.cashOutAt)
    )
    setValidCashOutAt(value: number) {
        return {
            betKey: this.betKey,
            cashOutAt: value,
        };
    }

    renderCashOutValue(value: number) {
        this.labelCashOutValue.string = formatCurrencyWithConfig(value);
    }

    renderInputValues(values: number[]) {
        this.nodeInputValues.children.forEach((child, index) => {
            const item = child.getComponent(InputValueItem);
            if (index < values.length) {
                item.setValue(values[index]);
            }
        });
    }

    @handle(BetControlStore, (handler, data: { betKey: number; index: number }) => handler.selectBetInput(data.betKey, data.index))
    onClickInputValue(index: number) {
        this.playSFX(AudioIds.CLICK);
        return {
            betKey: this.betKey,
            index: index,
        };
    }

    @handle(BetControlStore, (handler, data: { betKey: number; increase: boolean }) => handler.changeBetAmount(data.betKey, data.increase))
    onClickInreaseBet() {
        this.playSFX(AudioIds.CLICK);
        return {
            betKey: this.betKey,
            increase: true,
        };
    }

    @handle(BetControlStore, (handler, data: { betKey: number; increase: boolean }) => handler.changeBetAmount(data.betKey, data.increase))
    onClickDecreaseBet() {
        this.playSFX(AudioIds.CLICK);
        return {
            betKey: this.betKey,
            increase: false,
        };
    }

    setActiveDownBet(active: boolean) {
        this.btnDecreaseBet.interactable = active;
    }

    setActiveUpBet(active: boolean) {
        this.btnIncreaseBet.interactable = active;
    }
}
