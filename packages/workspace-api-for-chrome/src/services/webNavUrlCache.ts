import { queryAllTabs } from './utils';

enum WebNavState {
  NotNavigating,
  Navigating,
}

export class WebNavUrlCache {
  private readonly delay: number;
  private readonly verbose: boolean;
  private readonly tabTable: Record<number, { state: WebNavState; url: string }>;

  constructor(delay: number, verbose = false) {
    this.delay = delay;
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
   * Get cached URL of a tab.
   * @param tabId Tab ID of the tab to get URL from.
   */
  public getUrl = (tabId: number): string => {
    if (!Object.hasOwnProperty.call(this.tabTable, tabId)) {
      return '';
    }
    return this.tabTable[tabId].url;
  };

  private readFromExistedTabs = async (): Promise<void> => {
    const tabs = await queryAllTabs();
    tabs.forEach((tab) => {
      tab.id !== undefined &&
        (this.tabTable[tab.id] = {
          state: WebNavState.NotNavigating,
          url: tab.url || '',
        });
    });
    console.log('[📚 workspace-urlCache] Initiated tab table:', this.tabTable);
  };

  private onTabCreated = (tab: chrome.tabs.Tab): void => {
    if (tab.id === undefined) {
      return;
    }
    this.tabTable[tab.id] = {
      state: WebNavState.NotNavigating,
      url: tab.url || '',
    };
    if (this.verbose) {
      console.log(`[📚 workspace-urlCache] Added tab ${tab.id.toString()} to monitoring.`);
    }
  };

  private onTabRemoved = (tabId: number, removeInfo: chrome.tabs.TabRemoveInfo): void => {
    delete this.tabTable[tabId];
    if (this.verbose) {
      console.log(`[📚 workspace-urlCache] Removed tab ${tabId.toString()} from monitoring.`);
    }
  };

  private beginWebNav = (tabId: number, frameId: number, url: string): void => {
    if (!Object.hasOwnProperty.call(this.tabTable, tabId) || frameId !== 0) {
      return;
    }
    this.tabTable[tabId].state = WebNavState.Navigating;
    this.tabTable[tabId].url = url;
    if (this.verbose) {
      console.log(
        `[📚 workspace-urlCache] Began web navigation in tab ${tabId.toString()}. Cached URL is ${
          this.tabTable[tabId].url
        }.`
      );
    }
  };

  private endWebNav = (tabId: number, frameId: number, url: string): void => {
    if (!Object.hasOwnProperty.call(this.tabTable, tabId) || frameId !== 0) {
      return;
    }
    setTimeout(() => {
      // ignore the URL at the end of the navigation, do not update the URL here
      this.tabTable[tabId].state = WebNavState.NotNavigating;
      if (this.verbose) {
        console.log(
          `[📚 workspace-urlCache] Ended web navigation in tab ${tabId.toString()}. Cached URL is ${
            this.tabTable[tabId].url
          }.`
        );
      }
    }, this.delay);
  };

  private updateWebNav = (tabId: number, frameId: number, url: string): void => {
    if (!Object.hasOwnProperty.call(this.tabTable, tabId) || frameId !== 0) {
      return;
    }
    if (this.tabTable[tabId].state === WebNavState.NotNavigating) {
      // only update the URL when the tab is not navigating
      this.tabTable[tabId].url = url;
      if (this.verbose) {
        console.log(
          `[📚 workspace-urlCache] Received update in tab ${tabId.toString()}. Cached URL is ${
            this.tabTable[tabId].url
          }.`
        );
      }
    } else {
      if (this.verbose) {
        console.log(
          `[📚 workspace-urlCache] Ignored update in tab ${tabId.toString()}. Cached URL is ${
            this.tabTable[tabId].url
          }.`
        );
      }
    }
  };

  private onWebNavBeforeNavigate = (details: chrome.webNavigation.WebNavigationParentedCallbackDetails): void => {
    this.beginWebNav(details.tabId, details.frameId, details.url);
  };

  private onWebNavCommitted = (details: chrome.webNavigation.WebNavigationTransitionCallbackDetails): void => {
    this.updateWebNav(details.tabId, details.frameId, details.url);
  };

  private onWebNavCompleted = (details: chrome.webNavigation.WebNavigationFramedCallbackDetails): void => {
    this.endWebNav(details.tabId, details.frameId, details.url);
  };

  private onWebNavCreatedNavigationTarget = (
    details: chrome.webNavigation.WebNavigationSourceCallbackDetails
  ): void => {
    this.updateWebNav(details.tabId, 0, details.url);
  };

  private onWebNavDOMContentLoaded = (details: chrome.webNavigation.WebNavigationFramedCallbackDetails): void => {
    this.updateWebNav(details.tabId, details.frameId, details.url);
  };

  private onWebNavErrorOccurred = (details: chrome.webNavigation.WebNavigationFramedErrorCallbackDetails): void => {
    this.endWebNav(details.tabId, details.frameId, details.url);
  };

  private onWebNavHistoryStateUpdated = (
    details: chrome.webNavigation.WebNavigationTransitionCallbackDetails
  ): void => {
    this.updateWebNav(details.tabId, details.frameId, details.url);
  };

  private onWebNavReferenceFragmentUpdated = (
    details: chrome.webNavigation.WebNavigationTransitionCallbackDetails
  ): void => {
    this.updateWebNav(details.tabId, details.frameId, details.url);
  };

  private addListeners = () => {
    chrome.tabs.onCreated.addListener(this.onTabCreated);
    chrome.tabs.onRemoved.addListener(this.onTabRemoved);
    chrome.webNavigation.onBeforeNavigate.addListener(this.onWebNavBeforeNavigate);
    chrome.webNavigation.onCommitted.addListener(this.onWebNavCommitted);
    chrome.webNavigation.onCompleted.addListener(this.onWebNavCompleted);
    chrome.webNavigation.onCreatedNavigationTarget.addListener(this.onWebNavCreatedNavigationTarget);
    chrome.webNavigation.onDOMContentLoaded.addListener(this.onWebNavDOMContentLoaded);
    chrome.webNavigation.onErrorOccurred.addListener(this.onWebNavErrorOccurred);
    chrome.webNavigation.onHistoryStateUpdated.addListener(this.onWebNavHistoryStateUpdated);
    chrome.webNavigation.onReferenceFragmentUpdated.addListener(this.onWebNavReferenceFragmentUpdated);
  };

  private removeListeners = () => {
    chrome.tabs.onCreated.removeListener(this.onTabCreated);
    chrome.tabs.onRemoved.removeListener(this.onTabRemoved);
    chrome.webNavigation.onBeforeNavigate.removeListener(this.onWebNavBeforeNavigate);
    chrome.webNavigation.onCommitted.removeListener(this.onWebNavCommitted);
    chrome.webNavigation.onCompleted.removeListener(this.onWebNavCompleted);
    chrome.webNavigation.onCreatedNavigationTarget.removeListener(this.onWebNavCreatedNavigationTarget);
    chrome.webNavigation.onDOMContentLoaded.removeListener(this.onWebNavDOMContentLoaded);
    chrome.webNavigation.onErrorOccurred.removeListener(this.onWebNavErrorOccurred);
    chrome.webNavigation.onHistoryStateUpdated.removeListener(this.onWebNavHistoryStateUpdated);
    chrome.webNavigation.onReferenceFragmentUpdated.removeListener(this.onWebNavReferenceFragmentUpdated);
  };
}
