/**
 * Syncs the children of two elements, attempting to preserve elements by index.
 * Extra elements in the `to` tree are cloned over. Extra elements in the `from` tree are removed.
 */
function morphChildren(fromEl: Element, toEl: Element): void {
  const fromChildren = Array.from(fromEl.childNodes);
  const toChildren = Array.from(toEl.childNodes);
  const maxLength = Math.max(fromChildren.length, toChildren.length);

  for (let i = 0; i < maxLength; i++) {
    const fromChild = fromChildren[i];
    const toChild = toChildren[i];

    if (!fromChild && toChild) {
      fromEl.appendChild(toChild.cloneNode(true));
    } else if (fromChild && !toChild) {
      fromEl.removeChild(fromChild);
    } else if (fromChild && toChild) {
      morphNode(fromChild, toChild);
    }
  }
}

/**
 * Syncs attributes from one element to another.
 * Attributes on `fromEl` that are missing in `toEl` are removed.
 * Attributes on `toEl` are explicitly set on `fromEl`.
 */
function syncAttributes(fromEl: Element, toEl: Element): void {
  // Remove attributes that don't exist in `toEl`
  for (const attr of Array.from(fromEl.attributes)) {
    if (!toEl.hasAttribute(attr.name)) {
      fromEl.removeAttribute(attr.name);
    }
  }

  // Set or update attributes from `toEl`
  for (const attr of Array.from(toEl.attributes)) {
    if (fromEl.getAttribute(attr.name) !== attr.value) {
      fromEl.setAttribute(attr.name, attr.value);
    }
  }
}

/**
 * Morphs a `fromNode` into a `toNode` by directly mutating `fromNode`.
 * If node types or tags do not match, `fromNode` is replaced entirely.
 */
export function morphNode(fromNode: Node, toNode: Node): void {
  if (fromNode.nodeType !== toNode.nodeType) {
    fromNode.parentNode?.replaceChild(toNode.cloneNode(true), fromNode);
    return;
  }

  // Text or Comment nodes
  if (fromNode.nodeType === Node.TEXT_NODE || fromNode.nodeType === Node.COMMENT_NODE) {
    if (fromNode.nodeValue !== toNode.nodeValue) {
      fromNode.nodeValue = toNode.nodeValue;
    }
    return;
  }

  // Element nodes
  if (fromNode.nodeType === Node.ELEMENT_NODE && toNode.nodeType === Node.ELEMENT_NODE) {
    const fromEl = fromNode as Element;
    const toEl = toNode as Element;

    // If tag names differ, completely replace (e.g. <div> to <span>)
    if (fromEl.tagName !== toEl.tagName) {
      fromEl.parentNode?.replaceChild(toEl.cloneNode(true), fromEl);
      return;
    }

    // Sync attributes and recurse into children
    syncAttributes(fromEl, toEl);
    morphChildren(fromEl, toEl);
    return;
  }
}
