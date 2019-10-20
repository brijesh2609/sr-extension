function DOMtoString() {
  const canvasContainer = document.getElementsByClassName("candidateDownloadResume link");
  return canvasContainer && canvasContainer[0] && canvasContainer[0].dataset.href;
}

chrome.runtime.sendMessage({
  domain: "hirist.com",
  action: "getSource",
  source: DOMtoString()
});
