export function morphElement(oldNode: Node, newNode: Node): void {
    if (!oldNode || !newNode) return;

    if (oldNode.nodeType !== newNode.nodeType) {
        oldNode.parentNode?.replaceChild(newNode.cloneNode(true), oldNode);
        return;
    }

    if (oldNode.nodeType === Node.TEXT_NODE) {
        if (oldNode.nodeValue !== newNode.nodeValue) {
            oldNode.nodeValue = newNode.nodeValue;
        }
        return;
    }

    if (oldNode instanceof Element && newNode instanceof Element) {
        if (oldNode.tagName !== newNode.tagName) {
            oldNode.parentNode?.replaceChild(newNode.cloneNode(true), oldNode);
            return;
        }

        const oldAttrs = oldNode.attributes;
        const newAttrs = newNode.attributes;

        for (let i = oldAttrs.length - 1; i >= 0; i--) {
            const attr = oldAttrs[i];
            if (!newNode.hasAttribute(attr.name)) {
                oldNode.removeAttribute(attr.name);
            }
        }

        for (let i = 0; i < newAttrs.length; i++) {
            const attr = newAttrs[i];
            if (oldNode.getAttribute(attr.name) !== attr.value) {
                oldNode.setAttribute(attr.name, attr.value);
            }
        }

        if (oldNode instanceof HTMLInputElement && newNode instanceof HTMLInputElement) {
            if (oldNode.type !== "file" && document.activeElement !== oldNode && oldNode.value !== newNode.value) {
                oldNode.value = newNode.value;
            }
            if (oldNode.checked !== newNode.checked) {
                oldNode.checked = newNode.checked;
            }
        } else if (oldNode instanceof HTMLTextAreaElement && newNode instanceof HTMLTextAreaElement) {
            if (document.activeElement !== oldNode && oldNode.value !== newNode.value) {
                oldNode.value = newNode.value;
            }
        } else if (oldNode instanceof HTMLSelectElement && newNode instanceof HTMLSelectElement) {
            if (oldNode.value !== newNode.value) {
                oldNode.value = newNode.value;
            }
        }

        const oldChildren = Array.from(oldNode.childNodes);
        const newChildren = Array.from(newNode.childNodes);
        const maxLength = Math.max(oldChildren.length, newChildren.length);

        for (let i = 0; i < maxLength; i++) {
            const oldChild = oldChildren[i];
            const newChild = newChildren[i];

            if (oldChild && !newChild) {
                oldNode.removeChild(oldChild);
            } else if (!oldChild && newChild) {
                oldNode.appendChild(newChild.cloneNode(true));
            } else if (oldChild && newChild) {
                morphElement(oldChild, newChild);
            }
        }
    }
}
