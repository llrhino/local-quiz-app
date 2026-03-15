import { openUrl } from '@tauri-apps/plugin-opener';

type Props = {
  text: string | undefined;
  fallback?: string;
};

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export default function LinkText({ text, fallback }: Props) {
  if (text === undefined) {
    return <>{fallback}</>;
  }

  const parts = text.split(URL_REGEX);

  if (parts.length === 1) {
    return <>{text}</>;
  }

  return (
    <>
      {parts.map((part, index) =>
        URL_REGEX.test(part) ? (
          <button
            key={index}
            className="underline text-sky-600 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300"
            onClick={() => openUrl(part)}
            type="button"
          >
            {part}
          </button>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}
