import gc from "@sg/game-client-base";
import inversify from "inversify";
import { BetControlStore } from "../crash-v2/bet/bet-control-store";
const { injectable, inject } = inversify;
@injectable()
export class GameCrashUserSettingHandlerV2 extends gc.GameCrash.CrashGameUserSetting.GameCrashUserSettingHandler {
    @inject(BetControlStore) private readonly betControlStore: BetControlStore;

    saveTempStorage() {
        const settings = Object.keys(this.betControlStore.controls).reduce((acc, betKey) => {
            acc[betKey] = this.betControlStore.controls[betKey].setting;
            return acc;
        }, {});
        gc.StorageManager.set(gc.localStorageKeys.gameUserSetting, settings);
    }

    reloadOtherStores() {
        super.reloadOtherStores();
        this.betControlStore.onLoadStorage();
    }
}
