import { queryAllTabs, updateTab } from './utils';

export class TabUrlUpdateCache {
  private readonly depth: number;
  private readonly verbose: boolean;
  private readonly tabTable: Record<number, string[]>;

  constructor(depth: number, verbose = false) {
    this.depth = depth;
    this.verbose = verbose;
    this.tabTable = {};
    this.readFromExistedTabs().then(() => {
      this.addListeners();
    });
  }

  /**
   * Clean-up.
   */
  public destroy = (): void => {
    this.removeListeners();
  };

  /**
   * Update the URL of a tab if the URL does not exist in the history.
   * @param tabId Tab ID of the tab to update.
   * @param url URL to go to.
   */
  public updateUrl = async (tabId: number, url: string): Promise<void> => {
    if (!Object.hasOwnProperty.call(this.tabTable, tabId)) {
      return;
    }
    if (!this.tabTable[tabId].includes(url)) {
      await updateTab(tabId, url);
      this.forwardCache(tabId, url);
      if (this.verbose) {
        console.log(`[✏ workspace-updateCache] Update tab ${tabId.toString()} to URL ${url}.`);
      }
    } else {
      if (this.verbose) {
        console.log(`[✏ workspace-updateCache] Did not update tab ${tabId.toString()} due to duplicated URL ${url}.`);
      }
    }
  };

  private readFromExistedTabs = async (): Promise<void> => {
    const tabs = await queryAllTabs();
    tabs.forEach((tab) => {
      if (tab.id !== undefined) {
        this.tabTable[tab.id] = new Array(this.depth);
        this.forwardCache(tab.id, tab.url || '');
      }
    });
  };

  private forwardCache = (tabId: number, url: string): void => {
    if (!Object.hasOwnProperty.call(this.tabTable, tabId)) {
      return;
    }
    for (let i = 0; i < this.tabTable[tabId].length - 1; i++) {
      this.tabTable[tabId][i] = this.tabTable[tabId][i + 1];
    }
    this.tabTable[tabId][this.tabTable[tabId].length - 1] = url;
  };

  private onTabCreated = (tab: chrome.tabs.Tab): void => {
    tab.id !== undefined && (this.tabTable[tab.id] = new Array(this.depth));
  };

  private onTabRemoved = (tabId: number): void => {
    delete this.tabTable[tabId];
  };

  private addListeners = (): void => {
    chrome.tabs.onCreated.addListener(this.onTabCreated);
    chrome.tabs.onRemoved.addListener(this.onTabRemoved);
  };

  private removeListeners = (): void => {
    chrome.tabs.onCreated.removeListener(this.onTabCreated);
    chrome.tabs.onRemoved.removeListener(this.onTabRemoved);
  };
}
