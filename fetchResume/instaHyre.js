function DOMtoString() {
  let resumeTab = document.getElementById("resume-tab");
  if (resumeTab) {
    const pdf = resumeTab.getElementsByClassName("pdfViewer");
    const canvas = pdf[0].getElementsByTagName('canvas');
    const urls = [];
    let i = 0;
    for (i = 0; i < canvas.length; i++) {
      urls.push({
        url: canvas[i].toDataURL('image/jpeg'),
        height: canvas[i].height,
        width: canvas[i].width,
        page: i + 1
      });
    }

    return urls;
  }

  return;
}

chrome.runtime.sendMessage({
  domain: "instahyre.com",
  action: "getSource",
  source: DOMtoString()
});
