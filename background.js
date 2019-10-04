const redirectUrl = `https://ikgipgdgljjadgnddikiddaglkcppkjh.chromiumapp.org/provider_cb`

chrome.runtime.onInstalled.addListener(function () {

  chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { hostSuffix: 'angel.co' },
          }),

          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { hostSuffix: 'hirist.com' },
          })
        ],
        actions: [new chrome.declarativeContent.ShowPageAction()]
      }
    ]);
  });

  chrome.identity.launchWebAuthFlow(
    { 'url': `http://localhost:3000/webAuth?redirect_ui=${redirectUrl}`, 'interactive': true },
    function (redirect_url) {
      const token = redirect_url.split("authToken=")[1];
      chrome.storage.sync.set({ token }, function () {
        console.log("The color is green.", token);
      });
    });

});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log("background", request)
  if (request.contentScriptQuery === "fetchUrl") {
    fetch("https://angel.co" + request.resumePath)
      .then(res => {
        console.log(res);
        return res.blob();
      })
      .then(res => sendResponse(res))
      .catch(console.log);

    return true;
  }
});
