export class Sanitizer {
    static sanitize(dirty) {
        const template = document.createElement("template");
        template.innerHTML = dirty;
        const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT, null);
        while (walker.nextNode()) {
            const el = walker.currentNode;
            if (["script", "iframe", "object", "embed", "link", "meta", "form", "input", "button", "textarea", "select", "option", "style"].includes(el.tagName.toLowerCase())) {
                el.remove();
                continue;
            }
            [...el.attributes].forEach(attr => {
                const name = attr.name.toLowerCase();
                const value = attr.value.trim().toLowerCase();
                if (name.startsWith("on"))
                    el.removeAttribute(name);
                if (["href", "src", "srcdoc", "formaction"].includes(name)) {
                    if (/^(javascript|data|vbscript):/i.test(value))
                        el.removeAttribute(name);
                }
                if (name === "style") {
                    if (/url\s*\(|expression\s*\(/i.test(value))
                        el.removeAttribute(name);
                }
            });
        }
        return template.innerHTML;
    }
    static sanitizeToFragment(dirty) {
        const fragment = document.createDocumentFragment();
        const template = document.createElement("template");
        template.innerHTML = this.sanitize(dirty);
        fragment.appendChild(template.content);
        return fragment;
    }
}
//# sourceMappingURL=Sanitizer.js.map