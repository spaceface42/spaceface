export function isManualIdleShortcut(event: KeyboardEvent): boolean {
  if (event.defaultPrevented || event.repeat) return false;
  if (isEditableEventTarget(event.target)) return false;

  const isTriggerKey = event.code === "Period" || event.key === "." || event.key === ">";
  if (!isTriggerKey) return false;

  return event.ctrlKey && !event.metaKey && !event.altKey && event.shiftKey;
}

function isEditableEventTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  );
}
