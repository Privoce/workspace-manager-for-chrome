# workspace-api-for-chrome

[![npm version](https://badge.fury.io/js/workspace-api-for-chrome.svg)](https://badge.fury.io/js/workspace-api-for-chrome)

Provides workspace management capabilities for Chrome.

## How to use

Install the package:

```shell
npm add workspace-api-for-chrome
# or
yarn add workspace-api-for-chrome
```

Remember to declare the following permissions in `manifest.json`:

```json lines
"permissions": [
    "tabs",
    "webNavigation"
]
```

## API

Import and initialize an instance (note that the creation of the window should be done separately and beforehand):

```typescript
import Workspace from 'workspace-api-for-chrome';
// suppose a window is created,
// and its ID is stored in `windowId`
const workspace = new Workspace(windowId);
// if you want to control more advanced options
const workspace = new Workspace(windowId, { webNavEndDelay: 1000, tabUrlCacheDepth: 1 });
// also, if you want to enable logging
const workspace = new Workspace(windowId, {}, true);
```

The second parameter is an object with the following scheme:

```typescript
type WorkspaceOptions = {
  webNavEndDelay?: number;
  tabUrlCacheDepth?: number;
}
```

- `webNavEndDelay` is the milliseconds to wait before a *web navigation* is considered completed.
- `tabUrlCacheDepth` means how many URLs that are previously written to a tab should be recorded for duplication check.

### read()

Read the workspace and return an object (compatible with *write()*).

```typescript
const data = await workspace.read();
```

![](./docs/read.png)

#### Return Value

```typescript
type Data = {
  activeTabIndex: number;
  tabs: {
    url: string;
  }[];
};
```

### readRaw()

Read the workspace and return tabs in Chrome native format.

```typescript
const rawData = await workspace.readRaw();
```

![](./docs/read-raw.png)

#### Return Value

```typescript
type RawData = {
  tabs: chrome.tabs.Tab[];
};
```

### write()

Write the workspace and use minimal operations to make it align with the target state.

*Note:* if `activeTabIndex` is not provided, the active tab will remain the same; if `tabs` is not provided, the tabs
will not be synchronized.

```typescript
await workspace.write(data);
```

#### Parameter: *data*

```typescript
type OptionalData = {
  activeTabIndex?: number;
  tabs?: {
    url: string;
  }[];
};
```

### addEventListener()

Add callback function to handle events within the workspace.

```typescript
const callbackFn = (params) => {
  const { event, rawParams } = params;
  console.log(event, rawParams);
};
workspace.addEventHandler(callbackFn);
```

#### Parameter: *handlerToAdd*

```typescript
type EventHandler = (params: EventHandlerParams) => void;
```

*Note:* see [Type Definitions](#type-definitions) for detailed type definitions.

### removeEventHandler()

Remove callback function that handles events within the workspace.

```typescript
workspace.removeEventHandler(callbackFn);
```

#### Parameter: *handlerToRemove*

```typescript
type EventHandler = (params: EventHandlerParams) => void;
```

*Note:* see [Type Definitions](#type-definitions) for detailed type definitions.

### destroy()

Remove all internal listeners. Use it when you will no longer use the workspace instance.

```typescript
workspace.destroy();
```

## Type Definitions

```typescript
enum ITabEvent {
  OnActivated,
  OnAttached,
  OnCreated,
  OnDetached,
  OnHighlighted,
  OnMoved,
  OnRemoved,
  OnUpdated,
}
```

```typescript
type IEventHandlerParams =
  | {
      event: TabEvent.OnActivated;
      rawParams: { activeInfo: chrome.tabs.TabActiveInfo };
    }
  | {
      event: TabEvent.OnAttached;
      rawParams: { tabId: number; attachInfo: chrome.tabs.TabAttachInfo };
    }
  | {
      event: TabEvent.OnCreated;
      rawParams: { tab: chrome.tabs.Tab };
    }
  | {
      event: TabEvent.OnDetached;
      rawParams: { tabId: number; detachInfo: chrome.tabs.TabDetachInfo };
    }
  | {
      event: TabEvent.OnHighlighted;
      rawParams: { highlightInfo: chrome.tabs.TabHighlightInfo };
    }
  | {
      event: TabEvent.OnMoved;
      rawParams: { tabId: number; moveInfo: chrome.tabs.TabMoveInfo };
    }
  | {
      event: TabEvent.OnRemoved;
      rawParams: { tabId: number; removeInfo: chrome.tabs.TabRemoveInfo };
    }
  | {
      event: TabEvent.OnUpdated;
      rawParams: { tabId: number; changeInfo: chrome.tabs.TabChangeInfo; tab: chrome.tabs.Tab };
    };
```
