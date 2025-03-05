import { createRoot } from 'react-dom/client';
import { describe, it, vi, expect } from 'vitest';
import '@/main';

vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({
    render: vi.fn(),
  })),
}));

describe('main.tsx', () => {
  it('renders App inside StrictMode', () => {
    // `createRoot` が `#root` に対して呼ばれているかをチェック
    expect(createRoot).toHaveBeenCalledTimes(1);
    expect(createRoot).toHaveBeenCalledWith(document.getElementById('root'));

    // `render` が `StrictMode` と `App` を含むコンポーネントを受け取っているか
    const mockRender = (createRoot as vi.Mock).mock.results[0].value.render;
    expect(mockRender).toHaveBeenCalledTimes(1);
  });
});
