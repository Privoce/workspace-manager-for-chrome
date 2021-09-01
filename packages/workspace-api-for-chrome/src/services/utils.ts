export const checkEnv = (): void => {
  if (typeof chrome === 'undefined') {
    throw new ReferenceError('chrome is not defined, make sure you are using this package within a chrome environment');
  }
  if (typeof chrome.tabs === 'undefined') {
    throw new ReferenceError(
      'chrome.tab is not defined, make sure you are using this package with a chrome extension environment'
    );
  }
};

export const queryAllTabs = async (): Promise<chrome.tabs.Tab[]> => {
  return await new Promise<chrome.tabs.Tab[]>((resolve) => {
    chrome.tabs.query({}, resolve);
  });
};

export const queryAllTabsInWindow = async (windowId: number): Promise<chrome.tabs.Tab[]> => {
  return await new Promise<chrome.tabs.Tab[]>((resolve) => {
    chrome.tabs.query({ windowId }, resolve);
  });
};

export const removeTab = async (id: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    chrome.tabs.remove(id, resolve);
  });
};

export const moveTab = async (id: number, index: number): Promise<void> => {
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

export const updateTab = async (id: number, url: string): Promise<void> => {
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

export const createTab = async (windowId: number, index: number, url: string): Promise<void> => {
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

export const activateTab = async (windowId: number, index: number): Promise<void> => {
  const allTabs = await queryAllTabsInWindow(windowId);
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
