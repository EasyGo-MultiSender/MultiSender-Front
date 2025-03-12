// コピー機能、渡された変数をtrueにして、一秒後にfalseにする　（tooltipの表示を切り替えるため）

export const handleCopy = async (
  text: string,
  setCopied: (value: boolean) => void
) => {
  await navigator.clipboard.writeText(text);
  setCopied(true);
  setTimeout(() => setCopied(false), 1000);
};
