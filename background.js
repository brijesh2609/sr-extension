const redirectUrl = `https://pdkipihbnfkkgaehflnajlopcekgoalj.chromiumapp.org/provider_cb`

chrome.runtime.onInstalled.addListener(function () {


  chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [new chrome.declarativeContent.PageStateMatcher({
        pageUrl: { hostEquals: 'angel.co' },
      })
      ],
      actions: [new chrome.declarativeContent.ShowPageAction()]
    }]);
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