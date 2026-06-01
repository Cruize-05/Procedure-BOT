import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useChatScroll } from '../hooks/useChatScroll';

describe('useChatScroll', () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollTo = vi.fn();
  });

  it('returns a ref object with a current property', () => {
    const { result } = renderHook(() => useChatScroll([0]));
    expect(result.current).toHaveProperty('current');
  });

  it('calls scrollTo with smooth behavior when the dep value changes', async () => {
    const scrollTo = vi.fn();

    // Keep dep-array size constant (length 1) — same as the real hook usage
    const { result, rerender } = renderHook(
      ({ count }) => useChatScroll([count]),
      { initialProps: { count: 0 } }
    );

    // Attach mock DOM node to the ref between renders
    result.current.current = { scrollHeight: 800, scrollTo };

    await act(async () => {
      rerender({ count: 1 });
    });

    expect(scrollTo).toHaveBeenCalledWith({ top: 800, behavior: 'smooth' });
  });

  it('does not throw when the ref is still null during an effect', async () => {
    const { rerender } = renderHook(
      ({ count }) => useChatScroll([count]),
      { initialProps: { count: 0 } }
    );

    // ref.current is null — no DOM attached
    await expect(
      act(async () => rerender({ count: 1 }))
    ).resolves.not.toThrow();
  });
});
