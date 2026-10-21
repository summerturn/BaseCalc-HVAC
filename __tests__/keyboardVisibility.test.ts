import { nextKeyboardVisibility } from '../src/lib/keyboardVisibility';
import { observeKeyboardVisibility } from '../src/lib/keyboardVisibility';
import type { KeyboardEvent } from 'react-native';

describe('tab bar keyboard visibility', () => {
  it('ignores zero-height show notifications from iPad rotation', () => {
    expect(nextKeyboardVisibility(false, 'show', 0)).toBe(false);
    expect(nextKeyboardVisibility(true, 'show', 0)).toBe(true);
  });

  it('hides for a real keyboard and restores on hide', () => {
    let visible = false;
    visible = nextKeyboardVisibility(visible, 'show', 300);
    expect(visible).toBe(true);
    visible = nextKeyboardVisibility(visible, 'hide');
    expect(visible).toBe(false);
  });

  it('preserves legacy show events without a frame', () => {
    expect(nextKeyboardVisibility(false, 'show')).toBe(true);
  });

  it('subscribes to iOS events, filters rotation, and removes both listeners', () => {
    type EventName = 'keyboardWillShow' | 'keyboardWillHide' | 'keyboardDidShow' | 'keyboardDidHide';
    const listeners = new Map<EventName, (event: KeyboardEvent) => void>();
    const removed: EventName[] = [];
    const addListener = (name: EventName, listener: (event: KeyboardEvent) => void) => {
      listeners.set(name, listener);
      return { remove: () => { listeners.delete(name); removed.push(name); } };
    };
    const states: boolean[] = [];
    const event = (height: number): KeyboardEvent => ({
      duration: 0,
      easing: 'keyboard',
      endCoordinates: { height, width: 0, screenX: 0, screenY: 0 },
    });

    const unsubscribe = observeKeyboardVisibility(addListener, 'ios', (visible) => states.push(visible));
    expect([...listeners.keys()]).toEqual(['keyboardWillShow', 'keyboardWillHide']);
    listeners.get('keyboardWillShow')?.(event(0));
    expect(states).toEqual([]);
    listeners.get('keyboardWillShow')?.(event(300));
    expect(states).toEqual([true]);
    listeners.get('keyboardWillHide')?.(event(0));
    expect(states).toEqual([true, false]);

    unsubscribe();
    expect(removed).toEqual(['keyboardWillShow', 'keyboardWillHide']);
    expect(listeners.size).toBe(0);
  });

  it('keeps Android keyboard show semantics when the frame height is zero', () => {
    const listeners = new Map<string, (event: KeyboardEvent) => void>();
    const addListener = (name: string, listener: (event: KeyboardEvent) => void) => {
      listeners.set(name, listener);
      return { remove: () => { listeners.delete(name); } };
    };
    const states: boolean[] = [];
    const unsubscribe = observeKeyboardVisibility(addListener, 'android', (visible) => states.push(visible));
    expect([...listeners.keys()]).toEqual(['keyboardDidShow', 'keyboardDidHide']);
    listeners.get('keyboardDidShow')?.({
      duration: 0,
      easing: 'keyboard',
      endCoordinates: { height: 0, width: 0, screenX: 0, screenY: 0 },
    });
    expect(states).toEqual([true]);
    unsubscribe();
    expect(listeners.size).toBe(0);
  });
});
