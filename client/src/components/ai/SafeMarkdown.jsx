import { Fragment } from 'react';

const INLINE_PATTERN = /(\*\*[^*\n]+\*\*|\[[^\]\n]+\]\(https:\/\/[^)\s]+\))/g;

function InlineMarkdown({ text }) {
  return text.split(INLINE_PATTERN).filter(Boolean).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    const link = part.match(/^\[([^\]]+)\]\((https:\/\/[^)\s]+)\)$/);
    if (link) {
      return <a key={`${part}-${index}`} href={link[2]} target='_blank' rel='noreferrer' className='break-all text-blue-700 underline decoration-1 underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success dark:text-blue-300'>{link[1]}</a>;
    }
    return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
  });
}

export default function SafeMarkdown({ content }) {
  const lines = String(content ?? '').split('\n');
  const blocks = [];
  let paragraph = [];
  let list = [];

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', lines: paragraph });
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ type: 'list', lines: list });
    list = [];
  };

  lines.forEach((line) => {
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      list.push(bullet[1]);
    } else if (!line.trim()) {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraph.push(line);
    }
  });
  flushParagraph();
  flushList();

  return (
    <div className='space-y-3 break-words'>
      {blocks.map((block, index) => block.type === 'list' ? (
        <ul key={`list-${index}`} className='list-disc space-y-1 pl-5 marker:text-text-muted-light dark:marker:text-text-muted-dark'>
          {block.lines.map((line, itemIndex) => <li key={`${line}-${itemIndex}`}><InlineMarkdown text={line} /></li>)}
        </ul>
      ) : (
        <p key={`paragraph-${index}`}>
          {block.lines.map((line, lineIndex) => <Fragment key={`${line}-${lineIndex}`}>{lineIndex > 0 && <br />}<InlineMarkdown text={line} /></Fragment>)}
        </p>
      ))}
    </div>
  );
}
