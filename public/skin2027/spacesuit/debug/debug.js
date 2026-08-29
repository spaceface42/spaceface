/*
 * DEBUG
 */

const debugLabel = document.createElement("div");

debugLabel.id = "debug-label";
document.body.append(debugLabel);

function getPath(element) {
    const path = [];

    while (element instanceof HTMLElement) {
        let selector = element.tagName.toLowerCase();

        if (element.id) {
            selector += `#${element.id}`;
        } else if (element.classList.length) {
            selector += `.${[...element.classList].join(".")}`;
        }

        path.unshift(selector);
        element = element.parentElement;
    }

    return path.join(" > ");
}

document.addEventListener("pointermove", event => {
    const element = document.elementFromPoint(
        event.clientX,
        event.clientY
    );

    if (!(element instanceof HTMLElement)) return;

    const rect = element.getBoundingClientRect();

    debugLabel.textContent = getPath(element);

    debugLabel.style.left = `${rect.left}px`;
    debugLabel.style.top = `${rect.top}px`;
});
