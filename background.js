const uiUrl = "https://dev.springrecruit.com";

chrome.runtime.onInstalled.addListener(function () {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { hostSuffix: 'instahyre.com' },
          }),

          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { hostSuffix: 'hirist.com' },
          })
        ],
        actions: [new chrome.declarativeContent.ShowPageAction()]
      }
    ]);
  });

  const chromeUrl = chrome.runtime.getURL("");
  const extensionId = chromeUrl.substring(19, chromeUrl.length - 1);
  const redirectUrl = `https://${extensionId}.chromiumapp.org/provider_cb`;

  chrome.identity.launchWebAuthFlow(
    { 'url': `${uiUrl}/signin?redirect_ui=${redirectUrl}`, 'interactive': true },
    function (redirect_url) {
      let token = redirect_url.split("authToken=")[1];
      token = token.replace('Bearer%20', 'Bearer ');

      chrome.storage.sync.set({ token }, function () {
        console.log(token);
      });
    });

});

chrome.browserAction.onClicked.addListener(function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, "toggle");
  })
});
