import gc from "@sg/game-client-base";
import inversify from "inversify";
import { CrashBetListHandlers } from "../crash-v2";
import { BetControlStore } from "../crash-v2/bet/bet-control-store";
import { CrashCashOutData, CrashOwnBets } from "../crash-v2/interfaces";
const { injectable, inject } = inversify;

@injectable()
export class CrashCashOutHandlers extends gc.GameCrash.CrashCashOut.CrashCashOutHandlers {
    eventHandleList = [
        {
            name: gc.GameCrash.GameCrashServiceMessage.CrashCashOut.cashOutEventName,
            handle: this.handleCashOutFull,
        },
        {
            name: gc.GameServiceMessage.OwnBets.eventName,
            handle: this.handleOwnBets,
        },
    ];

    @inject(BetControlStore) private readonly betControlStore: BetControlStore;
    @inject(CrashBetListHandlers) private readonly crashBetListHandlers: CrashBetListHandlers;

    protected handleMultiplier() {
        //dont need, compute by betControlStore.getCashedOutValue(betKey)
    }

    protected handleCashOutFull(cashOut: CrashCashOutData) {
        this.retryGameHandler.clearInterval();
        this.betControlStore.setCashedOut(cashOut);
        this.handleCashOutMessage(cashOut);
        this.cashOutStore.setCashOutNotice(cashOut);

        setTimeout(() => {
            this.resetControl(cashOut.betKey);
        }, this.displayCashedOutDuration);
    }

    protected isCashedOutAllBets() {
        return this.betControlStore.isCashedOutAllBets();
    }

    protected handleOwnBets(ownBets: CrashOwnBets) {
        if (!ownBets) {
            return;
        }
        Object.keys(ownBets).forEach((betKey) => {
            const data = ownBets[betKey] as gc.GameCrash.GameCrashServiceMessage.CrashOwnBets;
            if (!data.cashOut) {
                this.betControlStore.setBetAmount(+betKey, data.amount);
                this.betControlStore.setAcceptedBet(+betKey, data.amount, false);
                if (data.autoCashOut > 0) {
                    this.betControlStore.setAutoCashOut(+betKey, true);
                    this.betControlStore.setValidCashOutAt(+betKey, data.autoCashOut);
                }
            }
        });

        this.crashBetListHandlers.handleOwnBets(ownBets);
    }

    protected resetCashOut() {
        this.betControlStore.resetLastBet();
        this.betStore.lastReceivedBet = null;
    }

    protected resetControl(betKey: number) {
        this.betControlStore.resetControl(betKey);
    }
}
