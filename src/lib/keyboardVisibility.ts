import type { KeyboardEvent } from 'react-native';

type KeyboardEventName = 'keyboardWillShow' | 'keyboardWillHide' | 'keyboardDidShow' | 'keyboardDidHide';
type AddKeyboardListener = (
  name: KeyboardEventName,
  listener: (event: KeyboardEvent) => void,
) => { remove(): void };

/** iOS 26+ can emit an empty keyboard show event during rotation without a hide event. */
export function nextKeyboardVisibility(
  visible: boolean,
  event: 'show' | 'hide',
  keyboardHeight?: number,
): boolean {
  if (event === 'hide') return false;
  return keyboardHeight === 0 ? visible : true;
}

export function observeKeyboardVisibility(
  addListener: AddKeyboardListener,
  platform: 'ios' | 'android',
  onChange: (visible: boolean) => void,
): () => void {
  let visible = false;
  const update = (event: 'show' | 'hide', height?: number) => {
    const next = nextKeyboardVisibility(visible, event, height);
    if (next !== visible) {
      visible = next;
      onChange(next);
    }
  };
  const show = addListener(platform === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
    (event) => update('show', platform === 'ios' ? event?.endCoordinates?.height : undefined));
  const hide = addListener(platform === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
    () => update('hide'));
  return () => {
    show.remove();
    hide.remove();
  };
}
