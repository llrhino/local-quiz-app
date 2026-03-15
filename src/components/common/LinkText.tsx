import type { ReactNode } from 'react';

import { openUrl } from '@tauri-apps/plugin-opener';

type Props = {
  text: string | undefined;
  fallback?: string;
};

// URLに有効な文字のみマッチ（日本語や全角記号はURLの一部として扱わない）
const URL_REGEX = /(https?:\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+)/g;

// 改行文字を <br /> に変換する
function renderWithLineBreaks(str: string, keyPrefix: string): ReactNode[] {
  const lines = str.split('\n');
  const result: ReactNode[] = [];
  lines.forEach((line, i) => {
    if (i > 0) {
      result.push(<br key={`${keyPrefix}-br-${i}`} />);
    }
    if (line) {
      result.push(<span key={`${keyPrefix}-${i}`}>{line}</span>);
    }
  });
  return result;
}

export default function LinkText({ text, fallback }: Props) {
  if (text === undefined) {
    return <>{fallback}</>;
  }

  const parts = text.split(URL_REGEX);

  if (parts.length === 1) {
    return <>{renderWithLineBreaks(text, 'solo')}</>;
  }

  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <button
            key={index}
            className="underline text-sky-600 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300"
            onClick={() => openUrl(part)}
            type="button"
          >
            {part}
          </button>
        ) : (
          <span key={index}>{renderWithLineBreaks(part, String(index))}</span>
        ),
      )}
    </>
  );
}
