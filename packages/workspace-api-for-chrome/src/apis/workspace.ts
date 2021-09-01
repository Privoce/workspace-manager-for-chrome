import { IDstItem, ISrcItem, ModificationStepsSolver } from '../services/modificationStepsSolver';
import { WebNavUrlCache } from '../services/webNavUrlCache';
import { TabUrlUpdateCache } from '../services/tabUrlUpdateCache';
import { activateTab, checkEnv, createTab, moveTab, queryAllTabsInWindow, removeTab } from '../services/utils';

export enum ITabEvent {
  OnActivated,
  OnAttached,
  OnCreated,
  OnDetached,
  OnHighlighted,
  OnMoved,
  OnRemoved,
  OnUpdated,
}

export type IEventHandlerParams =
  | {
      event: ITabEvent.OnActivated;
      rawParams: { activeInfo: chrome.tabs.TabActiveInfo };
    }
  | {
      event: ITabEvent.OnAttached;
      rawParams: { tabId: number; attachInfo: chrome.tabs.TabAttachInfo };
    }
  | {
      event: ITabEvent.OnCreated;
      rawParams: { tab: chrome.tabs.Tab };
    }
  | {
      event: ITabEvent.OnDetached;
      rawParams: { tabId: number; detachInfo: chrome.tabs.TabDetachInfo };
    }
  | {
      event: ITabEvent.OnHighlighted;
      rawParams: { highlightInfo: chrome.tabs.TabHighlightInfo };
    }
  | {
      event: ITabEvent.OnMoved;
      rawParams: { tabId: number; moveInfo: chrome.tabs.TabMoveInfo };
    }
  | {
      event: ITabEvent.OnRemoved;
      rawParams: { tabId: number; removeInfo: chrome.tabs.TabRemoveInfo };
    }
  | {
      event: ITabEvent.OnUpdated;
      rawParams: { tabId: number; changeInfo: chrome.tabs.TabChangeInfo; tab: chrome.tabs.Tab };
    };

export type IEventHandler = (params: IEventHandlerParams) => void;

export type ITab = {
  url: string;
};

export type IData = {
  activeTabIndex: number;
  tabs: ITab[];
};

export type IDataWithOptionalFields = {
  activeTabIndex?: number;
  tabs?: ITab[];
};

export type IRawData = {
  tabs: chrome.tabs.Tab[];
};

export type ITabFeatures = {
  url: string;
};

export type WorkspaceOptions = {
  webNavEndDelay?: number;
  tabUrlCacheDepth?: number;
};

const stringifyTabFeatures = (tabFeatures: ITabFeatures): string => {
  return JSON.stringify(tabFeatures);
};

const parseTabFeatures = (tabFeatures: string): ITabFeatures => {
  return JSON.parse(tabFeatures);
};

export class Workspace {
  private readonly windowId: number;
  private readonly verbose: boolean;
  private eventHandlers: Array<(params: IEventHandlerParams) => void>;
  private isWriting: boolean;
  private webNavUrlCache: WebNavUrlCache;
  private tabUrlUpdateCache: TabUrlUpdateCache;

  constructor(windowId: number, options: WorkspaceOptions = {}, verbose = false) {
    checkEnv();
    this.windowId = windowId;
    this.verbose = verbose;
    this.eventHandlers = [];
    this.isWriting = false;
    this.addListeners();
    this.webNavUrlCache = new WebNavUrlCache(options.webNavEndDelay || 1000, verbose);
    this.tabUrlUpdateCache = new TabUrlUpdateCache(options.tabUrlCacheDepth || 1, verbose);
  }

  /**
   * Clean-up.
   */
  public destroy = (): void => {
    this.removeListeners();
    this.webNavUrlCache.destroy();
    this.tabUrlUpdateCache.destroy();
  };

  /**
   * Add a callback function to handle workspace events.
   * @param handlerToAdd callback function
   */
  public addEventHandler = (handlerToAdd: IEventHandler): void => {
    this.eventHandlers.push(handlerToAdd);
  };

  /**
   * Remove a callback function.
   * @param handlerToRemove callback function
   */
  public removeEventHandler = (handlerToRemove: IEventHandler): void => {
    this.eventHandlers = this.eventHandlers.filter((handler) => handler !== handlerToRemove);
  };

  /**
   * Read workspace and return an object in compatible format.
   */
  public read = async (): Promise<IData> => {
    const tabs = await queryAllTabsInWindow(this.windowId);
    const index = tabs.filter((tab) => tab.active)[0]?.index;
    return {
      activeTabIndex: typeof index !== 'undefined' ? index : -1,
      tabs: tabs.map((rawTab) => ({
        url: rawTab.url || '',
      })),
    };
  };

  /**
   * Read workspace and return all its tabs.
   */
  public readRaw = async (): Promise<IRawData> => {
    const tabs = await queryAllTabsInWindow(this.windowId);
    return {
      tabs,
    };
  };

  /**
   * Accept an object in compatible format and update the workspace to aligned with it.
   * @param data workspace data
   */
  public write = async (data: IDataWithOptionalFields): Promise<void> => {
    this.isWriting = true;
    if (typeof data.tabs !== 'undefined') {
      const src: ISrcItem<number, string>[] = (await queryAllTabsInWindow(this.windowId)).map((tab) => ({
        id: typeof tab.id !== 'undefined' ? tab.id : -1,
        content: stringifyTabFeatures({
          url: tab.id !== undefined ? this.webNavUrlCache.getUrl(tab.id) : '',
        }),
      }));
      const dst: IDstItem<string>[] = data.tabs.map((tab) => ({
        content: stringifyTabFeatures({
          url: tab.url,
        }),
      }));
      const mss = new ModificationStepsSolver<number, string>();
      const steps = mss.getModificationSteps(src, dst);
      if (this.verbose) {
        console.log(
          '[✨ workspace-main] Source array:',
          src.map((item) => item.content)
        );
        console.log(
          '[✨ workspace-main] Destination array:',
          dst.map((item) => item.content)
        );
        console.log('[✨ workspace-main] Solved modification steps:', steps);
      }

      for (let i = 0; i < steps.removalSteps.length; i++) {
        await removeTab(steps.removalSteps[i].id);
      }
      for (let i = 0; i < steps.movingSteps.length; i++) {
        await moveTab(steps.movingSteps[i].id, steps.movingSteps[i].index);
      }
      for (let i = 0; i < steps.updatingSteps.length; i++) {
        await this.tabUrlUpdateCache.updateUrl(
          steps.updatingSteps[i].id,
          parseTabFeatures(steps.updatingSteps[i].content).url
        );
      }
      for (let i = 0; i < steps.creationSteps.length; i++) {
        await createTab(
          this.windowId,
          steps.creationSteps[i].index,
          parseTabFeatures(steps.creationSteps[i].content).url
        );
      }
    }
    if (typeof data.activeTabIndex !== 'undefined') {
      await activateTab(this.windowId, data.activeTabIndex);
    }
    this.isWriting = false;
  };

  private onActivatedListener = (activeInfo): void => {
    if (!this.isWriting && this.eventHandlers.length !== 0 && activeInfo.windowId === this.windowId) {
      this.eventHandlers.map((handler) => handler({ event: ITabEvent.OnActivated, rawParams: { activeInfo } }));
    }
  };

  private onAttachedListener = (tabId, attachInfo): void => {
    if (!this.isWriting && this.eventHandlers.length !== 0 && attachInfo.newWindowId === this.windowId) {
      this.eventHandlers.map((handler) => handler({ event: ITabEvent.OnAttached, rawParams: { tabId, attachInfo } }));
    }
  };

  private onCreatedListener = (tab): void => {
    if (!this.isWriting && this.eventHandlers.length !== 0 && tab.windowId === this.windowId) {
      this.eventHandlers.map((handler) => handler({ event: ITabEvent.OnCreated, rawParams: { tab } }));
    }
  };

  private onDetachedListener = (tabId, detachInfo): void => {
    if (!this.isWriting && this.eventHandlers.length !== 0 && detachInfo.oldWindowId === this.windowId) {
      this.eventHandlers.map((handler) => handler({ event: ITabEvent.OnDetached, rawParams: { tabId, detachInfo } }));
    }
  };

  private onHighlightedListener = (highlightInfo): void => {
    if (!this.isWriting && this.eventHandlers.length !== 0 && highlightInfo.windowId === this.windowId) {
      this.eventHandlers.map((handler) => handler({ event: ITabEvent.OnHighlighted, rawParams: { highlightInfo } }));
    }
  };

  private onMovedListener = (tabId, moveInfo): void => {
    if (!this.isWriting && this.eventHandlers.length !== 0 && moveInfo.windowId === this.windowId) {
      this.eventHandlers.map((handler) => handler({ event: ITabEvent.OnMoved, rawParams: { tabId, moveInfo } }));
    }
  };

  private onRemovedListener = (tabId, removeInfo): void => {
    if (!this.isWriting && this.eventHandlers.length !== 0 && removeInfo.windowId === this.windowId) {
      this.eventHandlers.map((handler) => handler({ event: ITabEvent.OnRemoved, rawParams: { tabId, removeInfo } }));
    }
  };

  private onUpdatedListener = (tabId, changeInfo, tab): void => {
    if (!this.isWriting && this.eventHandlers.length !== 0 && tab.windowId === this.windowId) {
      this.eventHandlers.map((handler) =>
        handler({ event: ITabEvent.OnUpdated, rawParams: { tabId, changeInfo, tab } })
      );
    }
  };

  private addListeners = (): void => {
    chrome.tabs.onActivated.addListener(this.onActivatedListener);
    chrome.tabs.onAttached.addListener(this.onAttachedListener);
    chrome.tabs.onCreated.addListener(this.onCreatedListener);
    chrome.tabs.onDetached.addListener(this.onDetachedListener);
    chrome.tabs.onHighlighted.addListener(this.onHighlightedListener);
    chrome.tabs.onMoved.addListener(this.onMovedListener);
    chrome.tabs.onRemoved.addListener(this.onRemovedListener);
    chrome.tabs.onUpdated.addListener(this.onUpdatedListener);
  };

  private removeListeners = (): void => {
    chrome.tabs.onActivated.removeListener(this.onActivatedListener);
    chrome.tabs.onAttached.removeListener(this.onAttachedListener);
    chrome.tabs.onCreated.removeListener(this.onCreatedListener);
    chrome.tabs.onDetached.removeListener(this.onDetachedListener);
    chrome.tabs.onHighlighted.removeListener(this.onHighlightedListener);
    chrome.tabs.onMoved.removeListener(this.onMovedListener);
    chrome.tabs.onRemoved.removeListener(this.onRemovedListener);
    chrome.tabs.onUpdated.removeListener(this.onUpdatedListener);
  };
}
