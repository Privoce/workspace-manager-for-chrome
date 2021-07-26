chrome.action.onClicked.addListener(async () => {
  await chrome.tabs.create({
    url: 'index.html',
  });
});
