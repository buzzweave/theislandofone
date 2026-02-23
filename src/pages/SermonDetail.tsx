function buildPagedHtmlFromHtml(title, scriptureRef, html) {
  // Build-safe
  if (typeof window === "undefined") {
    return wrapPlainTextAsHtmlPages(title, scriptureRef, html);
  }

  const doc = new DOMParser().parseFromString(html, "text/html");

  // If already wrapped, use as-is
  const existingPages = doc.querySelectorAll("section.pdf-page");
  if (existingPages.length > 0) return html;

  const bodyNodes = Array.from(doc.body.childNodes).filter((n) => {
    const isText = n && n.nodeType === 3; // TEXT_NODE
    if (isText) return (n.textContent ?? "").trim().length > 0;
    return true;
  });

  const isHeading = (node) => {
    if (!node || !node.tagName) return false;
    const tag = String(node.tagName).toLowerCase();
    return tag === "h1" || tag === "h2" || tag === "h3";
  };

  const headingText = (node) =>
    String(node?.textContent ?? "")
      .trim()
      .toUpperCase();

  const isMainPointHeading = (node) => isHeading(node) && headingText(node).startsWith("MAIN POINT");
  const isClosingHeading = (node) => {
    if (!isHeading(node)) return false;
    const t = headingText(node);
    return t.startsWith("CLOSING") || t.startsWith("ALTAR CALL") || t.startsWith("INVITATION");
  };
  const isScriptureHeading = (node) => {
    if (!isHeading(node)) return false;
    const t = headingText(node);
    return t === "SCRIPTURE" || t.startsWith("SCRIPTURE");
  };
  const isIllustrationHeading = (node) => {
    if (!isHeading(node)) return false;
    const t = headingText(node);
    return t === "ILLUSTRATION" || t.startsWith("OPENING ILLUSTRATION") || t.startsWith("ILLUSTRATION");
  };

  const findFirstIndex = (pred) => bodyNodes.findIndex((n) => pred(n));

  const scriptureIndex = findFirstIndex(isScriptureHeading);
  const illustrationIndex = findFirstIndex(isIllustrationHeading);

  const mainPointIndexes = [];
  let closingIndex = -1;

  bodyNodes.forEach((n, i) => {
    if (isMainPointHeading(n)) mainPointIndexes.push(i);
    if (closingIndex === -1 && isClosingHeading(n)) closingIndex = i;
  });

  const firstMP = mainPointIndexes.length > 0 ? mainPointIndexes[0] : -1;
  const endBeforeMainPoints = firstMP !== -1 ? firstMP : closingIndex !== -1 ? closingIndex : bodyNodes.length;

  const page1 = `
<section class="pdf-page title-page">
  <div class="title-wrap">
    <h1>${escapeHtml(title)}</h1>
    ${scriptureRef ? `<p class="subtitle">${escapeHtml(scriptureRef)}</p>` : ""}
  </div>
</section>`.trim();

  const pages = [page1];

  const wrapRangeAsPage = (start, end, className) => {
    const wrap = doc.createElement("div");
    bodyNodes.slice(start, end).forEach((n) => wrap.appendChild(n.cloneNode(true)));
    return `
<section class="pdf-page ${className}">
  ${wrap.innerHTML}
</section>`.trim();
  };

  const hasScripture = scriptureIndex !== -1 && scriptureIndex < endBeforeMainPoints;
  const hasIllustration = illustrationIndex !== -1 && illustrationIndex < endBeforeMainPoints;

  // Page 2 Scripture, Page 3 Illustration (if headings exist)
  if (hasScripture && hasIllustration) {
    const sStart = scriptureIndex;
    const sEnd = illustrationIndex > scriptureIndex ? illustrationIndex : endBeforeMainPoints;
    const iStart = illustrationIndex;
    const iEnd = endBeforeMainPoints;

    pages.push(wrapRangeAsPage(sStart, sEnd, "scripture-page"));
    pages.push(wrapRangeAsPage(iStart, iEnd, "illustration-page"));
  } else if (hasScripture && !hasIllustration) {
    pages.push(wrapRangeAsPage(scriptureIndex, endBeforeMainPoints, "scripture-page"));
  } else if (!hasScripture && hasIllustration) {
    if (illustrationIndex > 0) pages.push(wrapRangeAsPage(0, illustrationIndex, "scripture-page"));
    pages.push(wrapRangeAsPage(illustrationIndex, endBeforeMainPoints, "illustration-page"));
  } else {
    // Fallback: everything before first MAIN POINT becomes Page 2
    if (endBeforeMainPoints > 0) pages.push(wrapRangeAsPage(0, endBeforeMainPoints, "scripture-page"));
  }

  // MAIN POINT pages: split list bullets into groups of 5
  const endForMainPoints = closingIndex !== -1 ? closingIndex : bodyNodes.length;

  const buildPointPages = (nodes) => {
    const container = doc.createElement("div");
    nodes.forEach((n) => container.appendChild(n.cloneNode(true)));

    const listEl = container.querySelector("ul,ol");
    const headingEl = Array.from(container.children).find((el) => {
      const tag = String(el.tagName || "").toLowerCase();
      return tag === "h1" || tag === "h2" || tag === "h3";
    });

    if (!listEl) {
      return [
        `
<section class="pdf-page point-page">
  ${container.innerHTML}
</section>`.trim(),
      ];
    }

    const liEls = Array.from(listEl.querySelectorAll(":scope > li"));
    const groups = [];
    for (let i = 0; i < liEls.length; i += 5) groups.push(liEls.slice(i, i + 5));

    const preface = doc.createElement("div");
    Array.from(container.childNodes).forEach((child) => {
      if (child && child.nodeType === 1) {
        const tag = String(child.tagName || "").toLowerCase();
        if ((tag === "ul" || tag === "ol") && child === listEl) return;
      }
      preface.appendChild(child.cloneNode(true));
    });

    const listTag = String(listEl.tagName || "ul").toLowerCase();

    return groups.map((group, idx) => {
      const pageWrap = doc.createElement("div");

      if (idx === 0) {
        pageWrap.innerHTML = preface.innerHTML;
      } else if (headingEl) {
        pageWrap.appendChild(headingEl.cloneNode(true));
      }

      const newList = doc.createElement(listTag);
      group.forEach((li) => newList.appendChild(li.cloneNode(true)));
      pageWrap.appendChild(newList);

      return `
<section class="pdf-page point-page">
  ${pageWrap.innerHTML}
</section>`.trim();
    });
  };

  for (let i = 0; i < mainPointIndexes.length; i++) {
    const start = mainPointIndexes[i];
    const nextStart = i + 1 < mainPointIndexes.length ? mainPointIndexes[i + 1] : endForMainPoints;
    if (start >= endForMainPoints) break;

    const chunkNodes = bodyNodes.slice(start, nextStart);
    const pointPages = buildPointPages(chunkNodes);
    pointPages.forEach((p) => pages.push(p));
  }

  if (closingIndex !== -1) {
    pages.push(wrapRangeAsPage(closingIndex, bodyNodes.length, "closing-page"));
  }

  return pages.join("\n");
}
