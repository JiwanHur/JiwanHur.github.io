/**
 * Auto-link author names to personal pages.
 * AUTHOR_LINKS: "이름" -> URL 만 넣으면 됨. "이름*", "이름†" 등은 자동 매칭.
 * 링크 있음: 밑줄 + ↗ | 링크 없음: 흐린 스타일 + 툴팁 "개인 페이지 없음"
 */
(function () {
  var AUTHOR_LINKS = {
    "Jaehyun Choi": "https://pre6ent.github.io/",
    "Jaemyung Yu": "https://sites.google.com/view/jaemyungyu",
    "Jaehoon Cho": "https://jhcho90.github.io/"
  };

  function injectStyles() {
    if (document.getElementById("author-linkify-styles")) return;
    var style = document.createElement("style");
    style.id = "author-linkify-styles";
    style.textContent = [
      "/* pre6ent 방식: 저자 통일 색 + 링크는 밑줄에 색. 본인(strong)만 확실히 볼드 */",
      ".pub-authors {",
      "  color: #475569;",
      "  font-weight: 400;",
      "}",
      ".pub-authors authorname {",
      "  color: #475569;",
      "  font-weight: 400;",
      "}",
      ".pub-authors .author-link {",
      "  color: inherit;",
      "  font-weight: 400;",
      "  text-decoration: underline;",
      "  text-decoration-color: rgba(10, 60, 255, 0.30);",
      "  text-decoration-thickness: 1px;",
      "  text-underline-offset: 2px;",
      "}",
      ".pub-authors .author-link::after {",
      "  content: \"↗\";",
      "  font-size: 0.85em;",
      "  margin-left: 0.15em;",
      "  opacity: 0.40;",
      "}",
      ".pub-authors .author-link:hover {",
      "  text-decoration-color: rgba(10, 60, 255, 0.70);",
      "}",
      ".pub-authors strong {",
      "  color: #475569 !important;",
      "  font-weight: 800 !important;",
      "  font-size: 1.05em;",
      "  letter-spacing: 0.01em;",
      "  text-shadow: 0.25px 0 0 #475569, -0.25px 0 0 #475569, 0 0.25px 0 #475569, 0 -0.25px 0 #475569;",
      "}",
      ".pub-authors .author-no-link {",
      "  color: inherit;",
      "  font-weight: 400;",
      "  cursor: default;",
      "}",
      ".pub-authors strong .author-no-link {",
      "  font-weight: inherit;",
      "}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function normalizeName(name) {
    return name.replace(/\s*[*†]\s*$/, "").trim();
  }

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function buildNameRegex() {
    var baseNames = Object.keys(AUTHOR_LINKS).filter(Boolean);
    if (!baseNames.length) return null;
    baseNames.sort(function (a, b) { return b.length - a.length; });
    var alt = baseNames.map(escapeRegExp).join("|");
    return new RegExp("(^|[\\s,;\\(])(" + alt + ")(\\s*[*†])?(?=$|[\\s,;\\)\\.])", "g");
  }

  function getDisplayName(match) {
    var base = match[2];
    var suffix = (match[3] || "").trim();
    return base + suffix;
  }

  function isInsidePlaceholderA(textNode) {
    var parent = textNode.parentNode;
    var grand = parent && parent.parentNode;
    return parent && parent.nodeName && parent.nodeName.toLowerCase() === "authorname" &&
      grand && grand.nodeName && grand.nodeName.toLowerCase() === "a" && !grand.getAttribute("href");
  }

  function linkifyTextNode(textNode, NAME_RE) {
    var text = textNode.nodeValue;
    if (!text) return;
    NAME_RE.lastIndex = 0;
    if (!NAME_RE.test(text)) return;
    NAME_RE.lastIndex = 0;
    var matches = [];
    var m;
    while ((m = NAME_RE.exec(text)) !== null) {
      matches.push({ prefix: m[1], displayName: getDisplayName(m), nameStart: m.index + m[1].length });
    }
    if (!matches.length) return;
    var singleMatch = matches.length === 1 && text.trim() === matches[0].displayName;
    if (singleMatch && isInsidePlaceholderA(textNode)) {
      var wrapper = textNode.parentNode.parentNode;
      var displayName = matches[0].displayName;
      var baseName = normalizeName(displayName);
      var url = AUTHOR_LINKS[baseName];
      var a = document.createElement("a");
      a.href = url;
      a.textContent = displayName;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.className = "author-link";
      a.title = displayName;
      wrapper.parentNode.replaceChild(a, wrapper);
      return;
    }
    var frag = document.createDocumentFragment();
    var lastIndex = 0;
    for (var i = 0; i < matches.length; i++) {
      var match = matches[i];
      frag.appendChild(document.createTextNode(text.slice(lastIndex, match.nameStart)));
      var baseName = normalizeName(match.displayName);
      var url = AUTHOR_LINKS[baseName];
      var a = document.createElement("a");
      a.href = url;
      a.textContent = match.displayName;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.className = "author-link";
      a.title = match.displayName + " – 개인 페이지";
      frag.appendChild(a);
      lastIndex = match.nameStart + match.displayName.length;
    }
    frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    textNode.parentNode.replaceChild(frag, textNode);
  }

  function linkifyAuthors(rootEl, NAME_RE) {
    var walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var parent = node.parentNode;
        if (!parent) return NodeFilter.FILTER_REJECT;
        var anc = parent.closest && parent.closest("a");
        if (anc && anc.getAttribute("href")) return NodeFilter.FILTER_REJECT;
        if (parent.closest && (parent.closest("script") || parent.closest("style"))) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      linkifyTextNode(node, NAME_RE);
    });
  }

  function markNoLinkAuthors(rootEl) {
    var candidates = rootEl.querySelectorAll("authorname, strong");
    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (el.querySelector("a.author-link")) continue;
      var text = (el.textContent || "").trim();
      if (!text) continue;
      var base = normalizeName(text);
      if (AUTHOR_LINKS[base]) continue;
      var span = document.createElement("span");
      span.className = "author-no-link";
      span.title = "개인 페이지 없음";
      span.textContent = text;
      el.textContent = "";
      el.appendChild(span);
    }
  }

  function run() {
    injectStyles();
    var NAME_RE = buildNameRegex();
    var els = document.querySelectorAll(".pub-authors");
    if (NAME_RE) {
      for (var i = 0; i < els.length; i++) {
        linkifyAuthors(els[i], NAME_RE);
      }
    }
    for (var j = 0; j < els.length; j++) {
      markNoLinkAuthors(els[j]);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
