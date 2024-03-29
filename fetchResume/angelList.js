function DOMtoString(document_root) {
    var html = '',
        node = document_root.firstChild;
    while (node) {
        switch (node.nodeType) {
            case Node.ELEMENT_NODE:
                html += node.outerHTML;
                break;
            case Node.TEXT_NODE:
                html += node.nodeValue;
                break;
            case Node.CDATA_SECTION_NODE:
                html += '<![CDATA[' + node.nodeValue + ']]>';
                break;
            case Node.COMMENT_NODE:
                html += '<!--' + node.nodeValue + '-->';
                break;
            case Node.DOCUMENT_TYPE_NODE:
                html += "<!DOCTYPE " + node.name + (node.publicId ? ' PUBLIC "' + node.publicId + '"' : '') + (!node.publicId && node.systemId ? ' SYSTEM' : '') + (node.systemId ? ' "' + node.systemId + '"' : '') + '>\n';
                break;
        }
        node = node.nextSibling;
    }

    const sourceIndex = html.indexOf("resume_url");
    const hrefIndex = html.indexOf("href=", sourceIndex - 100);
    const resumeLink = html.substring(hrefIndex + 6, sourceIndex + 10);
    return resumeLink;
}

// chrome.runtime.sendMessage({
//     action: "getSource",
//     source: DOMtoString(document)
// });

chrome.runtime.sendMessage(
    {
        contentScriptQuery: "fetchUrl",
        resumePath: DOMtoString(document)
    },
    function (resume) {
        chrome.runtime.sendMessage({
            domain: "angel.co",
            action: "getSource",
            source: resume
        });
    }
);
