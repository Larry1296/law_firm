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
  const lines = String(content ?? '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let list = null;

  const flushList = () => {
    if (list) blocks.push(list);
    list = null;
  };

  lines.forEach((line) => {
    const bullet = line.match(/^\s*[-*\u2022]\s+(.+)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    const heading = line.match(/^\s*#{1,6}\s+(.+)$/);
    const item = bullet || numbered;
    if (item) {
      const type = bullet ? 'ul' : 'ol';
      if (list?.type !== type) {
        flushList();
        list = { type, lines: [] };
      }
      list.lines.push(item[1]);
    } else if (!line.trim()) {
      flushList();
    } else {
      flushList();
      // Each line of prose is its own paragraph, so replies never render as one dense block.
      blocks.push({ type: heading ? 'heading' : 'paragraph', text: (heading ? heading[1] : line).trim() });
    }
  });
  flushList();

  return (
    <div className='space-y-4 break-words leading-7'>
      {blocks.map((block, index) => {
        if (block.type === 'ul' || block.type === 'ol') {
          const List = block.type;
          return (
            <List key={`list-${index}`} className={`${block.type === 'ul' ? 'list-disc' : 'list-decimal'} space-y-2 pl-5 marker:text-text-muted-light dark:marker:text-text-muted-dark`}>
              {block.lines.map((line, itemIndex) => <li key={`${line}-${itemIndex}`} className='pl-1'><InlineMarkdown text={line} /></li>)}
            </List>
          );
        }
        if (block.type === 'heading') {
          return <p key={`heading-${index}`} className='pt-1 font-semibold'><InlineMarkdown text={block.text.replace(/^\*\*(.+)\*\*$/, '$1')} /></p>;
        }
        return <p key={`paragraph-${index}`}><InlineMarkdown text={block.text} /></p>;
      })}
    </div>
  );
}
