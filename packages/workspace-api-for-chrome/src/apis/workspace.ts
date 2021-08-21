/**
 * Type Definitions
 */

import { IDstItem, ISrcItem, ModificationStepsSolver } from '../services/algo';

export enum TabEvent {
  onActivated,
  onAttached,
  onCreated,
  onDetached,
  onHighlighted,
  onMoved,
  onRemoved,
  onUpdated,
}

export type EventHandlerParams =
  | {
      event: TabEvent.onActivated;
      rawParams: { activeInfo: chrome.tabs.TabActiveInfo };
    }
  | {
      event: TabEvent.onAttached;
      rawParams: { tabId: number; attachInfo: chrome.tabs.TabAttachInfo };
    }
  | {
      event: TabEvent.onCreated;
      rawParams: { tab: chrome.tabs.Tab };
    }
  | {
      event: TabEvent.onDetached;
      rawParams: { tabId: number; detachInfo: chrome.tabs.TabDetachInfo };
    }
  | {
      event: TabEvent.onHighlighted;
      rawParams: { highlightInfo: chrome.tabs.TabHighlightInfo };
    }
  | {
      event: TabEvent.onMoved;
      rawParams: { tabId: number; moveInfo: chrome.tabs.TabMoveInfo };
    }
  | {
      event: TabEvent.onRemoved;
      rawParams: { tabId: number; removeInfo: chrome.tabs.TabRemoveInfo };
    }
  | {
      event: TabEvent.onUpdated;
      rawParams: { tabId: number; changeInfo: chrome.tabs.TabChangeInfo; tab: chrome.tabs.Tab };
    };

export type EventHandler = (params: EventHandlerParams) => void;

export type Tab = {
  url: string;
};

export type RawTab = chrome.tabs.Tab;

export type Data = {
  activeTabIndex: number;
  tabs: Tab[];
};

export type OptionalData = {
  activeTabIndex?: number;
  tabs?: Tab[];
};

export type RawData = {
  tabs: RawTab[];
};

export type TabFeatures = {
  url: string;
};

/**
 * Utilities
 */

const checkEnv = () => {
  if (typeof chrome === 'undefined') {
    throw new ReferenceError('chrome is not defined, make sure you are using this package within a chrome environment');
  }
  if (typeof chrome.tabs === 'undefined') {
    throw new ReferenceError(
      'chrome.tab is not defined, make sure you are using this package with a chrome extension environment'
    );
  }
};

const queryAllTabs = async (windowId: number): Promise<RawTab[]> => {
  return await new Promise<RawTab[]>((resolve) => {
    chrome.tabs.query({ windowId }, resolve);
  });
};

const rawTab2Tab = (rawTab: RawTab): Tab => ({
  url: rawTab.url || '',
});

const removeTab = async (id: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    chrome.tabs.remove(id, resolve);
  });
};

const moveTab = async (id: number, index: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    chrome.tabs.move(
      id,
      {
        index,
      },
      () => {
        resolve();
      }
    );
  });
};

const updateTab = async (id: number, url: string): Promise<void> => {
  await new Promise<void>((resolve) => {
    chrome.tabs.update(
      id,
      {
        url,
      },
      () => {
        resolve();
      }
    );
  });
};

const createTab = async (windowId: number, index: number, url: string): Promise<void> => {
  await new Promise<void>((resolve) => {
    chrome.tabs.create(
      {
        windowId,
        index,
        url,
        active: false,
      },
      () => {
        resolve();
      }
    );
  });
};

const activateTab = async (windowId: number, index: number): Promise<void> => {
  const allTabs = await queryAllTabs(windowId);
  await new Promise<void>((resolve) => {
    chrome.tabs.update(
      typeof allTabs[index]?.id !== 'undefined' ? (allTabs[index]?.id as number) : -1,
      {
        active: true,
      },
      () => {
        resolve();
      }
    );
  });
};

const stringifyTabFeatures = (tabFeatures: TabFeatures): string => {
  return JSON.stringify(tabFeatures);
};

const parseTabFeatures = (tabFeatures: string): TabFeatures => {
  return JSON.parse(tabFeatures);
};

export class Workspace {
  private readonly verbose: boolean;
  private readonly windowId: number;
  private eventHandlers: Array<(params: EventHandlerParams) => void>;
  private isOperating: boolean;

  constructor(windowId: number, verbose = false) {
    this.verbose = verbose;
    checkEnv();
    this.windowId = windowId;
    this.eventHandlers = [];
    this.isOperating = false;
    this.batchAddListeners();
  }

  /**
   * Clean-up all internal resources.
   */
  public destroy = (): void => {
    this.batchRemoveListeners();
  };

  /**
   * Add a callback function to handle workspace events.
   * @param handlerToAdd callback function
   */
  public addEventHandler = (handlerToAdd: EventHandler): void => {
    this.eventHandlers.push(handlerToAdd);
  };

  /**
   * Remove a callback function.
   * @param handlerToRemove callback function
   */
  public removeEventHandler = (handlerToRemove: EventHandler): void => {
    this.eventHandlers = this.eventHandlers.filter((handler) => handler !== handlerToRemove);
  };

  /**
   * Read workspace and return an object in compatible format.
   */
  public read = async (): Promise<Data> => {
    const tabs = await queryAllTabs(this.windowId);
    const index = tabs.filter((tab) => tab.active)[0]?.index;
    return {
      activeTabIndex: typeof index !== 'undefined' ? index : -1,
      tabs: tabs.map(rawTab2Tab),
    };
  };

  /**
   * Read workspace and return all its tabs.
   */
  public readRaw = async (): Promise<RawData> => {
    const tabs = await queryAllTabs(this.windowId);
    return {
      tabs,
    };
  };

  /**
   * Accept an object in compatible format and update the workspace to aligned with it.
   * @param data workspace data
   */
  public write = async (data: OptionalData): Promise<void> => {
    this.isOperating = true;
    if (typeof data.tabs !== 'undefined') {
      const src: ISrcItem<number, string>[] = (await queryAllTabs(this.windowId)).map((tab) => ({
        id: typeof tab.id !== 'undefined' ? tab.id : -1,
        content: stringifyTabFeatures({ url: tab.url || '' }),
      }));
      const dst: IDstItem<string>[] = data.tabs.map((tab) => ({
        content: stringifyTabFeatures({ url: tab.url || '' }),
      }));
      const mss = new ModificationStepsSolver<number, string>();
      const steps = mss.getModificationSteps(src, dst);
      if (this.verbose) {
        console.log(steps);
      }

      for (let i = 0; i < steps.removalSteps.length; i++) {
        await removeTab(steps.removalSteps[i].id);
      }
      for (let i = 0; i < steps.movingSteps.length; i++) {
        await moveTab(steps.movingSteps[i].id, steps.movingSteps[i].index);
      }
      for (let i = 0; i < steps.updatingSteps.length; i++) {
        await updateTab(steps.updatingSteps[i].id, parseTabFeatures(steps.updatingSteps[i].content).url);
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
    this.isOperating = false;
  };

  /**
   * Internal Listeners
   */

  private onActivatedListener = (activeInfo) => {
    if (!this.isOperating && this.eventHandlers.length !== 0 && activeInfo.windowId === this.windowId) {
      this.eventHandlers.map((handler) => handler({ event: TabEvent.onActivated, rawParams: { activeInfo } }));
    }
  };

  private onAttachedListener = (tabId, attachInfo) => {
    if (!this.isOperating && this.eventHandlers.length !== 0 && attachInfo.newWindowId === this.windowId) {
      this.eventHandlers.map((handler) => handler({ event: TabEvent.onAttached, rawParams: { tabId, attachInfo } }));
    }
  };

  private onCreatedListener = (tab) => {
    if (!this.isOperating && this.eventHandlers.length !== 0 && tab.windowId === this.windowId) {
      this.eventHandlers.map((handler) => handler({ event: TabEvent.onCreated, rawParams: { tab } }));
    }
  };

  private onDetachedListener = (tabId, detachInfo) => {
    if (!this.isOperating && this.eventHandlers.length !== 0 && detachInfo.oldWindowId === this.windowId) {
      this.eventHandlers.map((handler) => handler({ event: TabEvent.onDetached, rawParams: { tabId, detachInfo } }));
    }
  };

  private onHighlightedListener = (highlightInfo) => {
    if (!this.isOperating && this.eventHandlers.length !== 0 && highlightInfo.windowId === this.windowId) {
      this.eventHandlers.map((handler) => handler({ event: TabEvent.onHighlighted, rawParams: { highlightInfo } }));
    }
  };

  private onMovedListener = (tabId, moveInfo) => {
    if (!this.isOperating && this.eventHandlers.length !== 0 && moveInfo.windowId === this.windowId) {
      this.eventHandlers.map((handler) => handler({ event: TabEvent.onMoved, rawParams: { tabId, moveInfo } }));
    }
  };

  private onRemovedListener = (tabId, removeInfo) => {
    if (!this.isOperating && this.eventHandlers.length !== 0 && removeInfo.windowId === this.windowId) {
      this.eventHandlers.map((handler) => handler({ event: TabEvent.onRemoved, rawParams: { tabId, removeInfo } }));
    }
  };

  private onUpdatedListener = (tabId, changeInfo, tab) => {
    if (!this.isOperating && this.eventHandlers.length !== 0 && tab.windowId === this.windowId) {
      this.eventHandlers.map((handler) =>
        handler({ event: TabEvent.onUpdated, rawParams: { tabId, changeInfo, tab } })
      );
    }
  };

  /**
   * Batch Listener Operations
   */

  private batchAddListeners = () => {
    chrome.tabs.onActivated.addListener(this.onActivatedListener);
    chrome.tabs.onAttached.addListener(this.onAttachedListener);
    chrome.tabs.onCreated.addListener(this.onCreatedListener);
    chrome.tabs.onDetached.addListener(this.onDetachedListener);
    chrome.tabs.onHighlighted.addListener(this.onHighlightedListener);
    chrome.tabs.onMoved.addListener(this.onMovedListener);
    chrome.tabs.onRemoved.addListener(this.onRemovedListener);
    chrome.tabs.onUpdated.addListener(this.onUpdatedListener);
  };

  private batchRemoveListeners = () => {
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
