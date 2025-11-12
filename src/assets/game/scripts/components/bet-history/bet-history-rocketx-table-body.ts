import gc from "@sg/game-client-base";
import { _decorator, Button, instantiate, Node, Prefab, ScrollView, UITransform, Vec3 } from "cc";
import Observer from "observer";

import { ObserverComponent } from "db://shared-components/shared/common-components/observer-component/scripts/observer-component";
import { BetHistoryRocketXModel, BetHistoryRocketXStore } from "../../handlers/crash-v2/bet/rocketx-bet-history-store";
import { BetHistoryRocketXHandlers, HistoryConstants } from "../../handlers/crash-v2/handlers/bet-history-handlers";
import BetResultHistoryBodyItem from "./bet-history-rocketx-table-body-row";

const { ccclass, property } = _decorator;
const { render, handle } = Observer;

@ccclass("BetHistoryRocketXTableBody")
export class BetHistoryRocketXTableBody extends ObserverComponent {
    @property({ type: Node })
    content: Node = null;

    @property({ type: Prefab })
    itemPrefab: Prefab = null;

    @property({ type: Node })
    reachMaxWinNode: Node = null;

    private readonly TOOLTIP_POSITION_X = 230;
    private readonly TOOLTIP_POSITION_Y_BUFFER = 48;

    private startYPosition = 0;
    private itemHeight = 0;
    private currentPageIndex = 1;
    private currentIndex = 0;
    private isFetchingData = false;
    private isNodataToFetch = false;
    private pageSize = 0;

    private getHistoryItemComponent(node: Node): BetResultHistoryBodyItem {
        return node.getComponent(BetResultHistoryBodyItem);
    }

    private buildBodyRow(
        bodyItem: Node,
        betHistoryLog: gc.BetHistory.BetHistoryLog,
        index: number,
        betKey: number,
        fractionalOddsFormat = false
    ): Node {
        const component = this.getHistoryItemComponent(bodyItem);
        component?.setData({
            betHistoryLog,
            index,
            betKey,
            fractionalOddsFormat,
        });

        bodyItem.on(HistoryConstants.hoverTriggerParent, this.handleHoverMaxReachTrigger, this);
        bodyItem.on(HistoryConstants.exitHoverTriggerParent, this.handleExitHoverMaxReachTrigger, this);

        return bodyItem;
    }

    private handleHoverMaxReachTrigger(childNode: Node): void {
        const tooltipButton = this.reachMaxWinNode.getComponent(Button);
        const position = childNode.getPosition();
        const positionY = this.content.getPosition().y + position.y - this.TOOLTIP_POSITION_Y_BUFFER;

        tooltipButton.node.setPosition(new Vec3(this.TOOLTIP_POSITION_X, positionY, 0));
        tooltipButton.node.active = true;
    }

    private handleExitHoverMaxReachTrigger(): void {
        const tooltipButton = this.reachMaxWinNode.getComponent(Button);
        tooltipButton.node.active = false;
    }

    @handle(BetHistoryRocketXHandlers.BetHistoryRocketXCallServiceHandler, (handler, pageNumber: number) =>
        handler.getHistory(pageNumber, HistoryConstants.pageSizeHistory, HistoryConstants.history)
    )
    private fetchData(): number {
        return this.currentPageIndex;
    }

    @render(BetHistoryRocketXStore, (store) => store.betHistoryRocketXModel, { fireImmediately: false })
    private showBetHistory(betHistoryRocketXModel: BetHistoryRocketXModel): void {
        this.renderData(betHistoryRocketXModel);
    }

    private renderData(betHistoryRocketXModel: BetHistoryRocketXModel): void {
        if (!this.itemPrefab) {
            return;
        }

        betHistoryRocketXModel.betLogs.forEach((betLogItem, rowIndex) => {
            this.renderBetLogDetails(betLogItem, rowIndex);
        });

        this.updateContentState(betHistoryRocketXModel);
    }

    private renderBetLogDetails(betLogItem: gc.BetHistory.BetHistoryLog, rowIndex: number): void {
        betLogItem.betLogDetails.forEach((betLogDetail) => {
            if (betLogDetail.action.toString() !== gc.GameClientEmitMessage.Bet.eventName.toString()) {
                return;
            }

            const bodyItem = instantiate(this.itemPrefab);
            const item = this.buildBodyRow(bodyItem, betLogItem, rowIndex, Number(betLogDetail.betKey));

            this.content.addChild(item);
            this.positionItem(item);
            this.currentIndex++;
        });
    }

    private positionItem(item: Node): void {
        const currentPosition = item.getPosition();
        const y = this.startYPosition - this.currentIndex * this.itemHeight;
        item.setPosition(currentPosition.x, y);
    }

    private updateContentState(betHistoryRocketXModel: BetHistoryRocketXModel): void {
        if (betHistoryRocketXModel.betLogs.length < this.pageSize) {
            this.isNodataToFetch = true;
        }

        this.content.getComponent(UITransform).height = this.currentIndex * this.itemHeight;
        this.isFetchingData = false;
    }

    onLoad() {
        this.initializeProperties();
        super.onLoad();
        this.fetchData();
        this.setupScrollListener();
    }

    private initializeProperties() {
        this.pageSize = HistoryConstants.pageSizeHistory;
        this.itemHeight = this.itemPrefab.data.getComponent(UITransform).height;
        this.startYPosition = -this.itemHeight / 2;
    }

    private setupScrollListener() {
        this.node.on(ScrollView.EventType.SCROLL_TO_BOTTOM, this.handleScroll, this);
    }

    private handleScroll() {
        if (this.isNodataToFetch || this.isFetchingData) {
            return;
        }

        this.currentPageIndex++;
        this.isFetchingData = true;
        this.fetchData();
    }

    onDestroy() {
        if (this.node) {
            this.node.off(ScrollView.EventType.SCROLL_TO_BOTTOM, this.handleScroll, this);
        }
    }
}
