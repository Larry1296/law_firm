import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HelpCenter, { TutorialDetail } from './HelpCenter';
import TutorialAdmin from './TutorialAdmin';
import VideoPlayer from './VideoPlayer';
import { formatTime, parseTime, helpBase, tutorials } from './api';
const mocks = vi.hoisted(() => ({
  user: {
    role: 'ADMIN'
  }
}));
vi.mock('@/core/hooks/useAuth', () => ({
  default: () => ({
    user: mocks.user
  })
}));
vi.mock('./api', async original => ({
  ...(await original()),
  tutorials: {
    list: vi.fn(),
    categories: vi.fn(),
    recent: vi.fn(),
    featured: vi.fn(),
    get: vi.fn(),
    save: vi.fn(),
    category: vi.fn(),
    progress: vi.fn()
  }
}));
const tutorial = {
  id: 'one',
  title: 'Managing clients',
  category: 'cat',
  category_name: 'Clients',
  description: 'Learn client registration',
  duration: 300,
  provider: 'youtube',
  video_reference: 'M7lc1UVf-VE',
  chapters: [{
    id: 'a',
    title: 'Introduction',
    start: 0
  }, {
    id: 'b',
    title: 'Register client',
    start: 120
  }],
  audiences: [],
  progress: {
    position: 80,
    percentage: 10
  }
};
const wrap = component => render(<MemoryRouter initialEntries={['/admin/help']}>{component}</MemoryRouter>);
beforeEach(() => {
  mocks.user = {
    role: 'ADMIN'
  };
  tutorials.list.mockResolvedValue({
    results: [tutorial],
    count: 1
  });
  tutorials.categories.mockResolvedValue([{
    id: 'cat',
    name: 'Clients'
  }]);
  tutorials.featured.mockResolvedValue({results: []});
  tutorials.recent.mockResolvedValue({
    results: []
  });
  tutorials.get.mockResolvedValue(tutorial);
  tutorials.progress.mockResolvedValue({});
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
  delete window.YT;
});
describe('timestamps and routing', () => {
  it('converts and formats timestamps', () => {
    expect(parseTime('08:35')).toBe(515);
    expect(parseTime('1:05:20')).toBe(3920);
    expect(formatTime(3920)).toBe('1:05:20');
    expect(formatTime(0)).toBe('00:00');
  });
  it('rejects malformed timestamps', () => {
    for (const value of ['-1:00', '8:70', 'abc', '1:99:00']) expect(() => parseTime(value)).toThrow();
  });
  it('uses actual role workspace paths', () => {
    expect(helpBase('/lawyer/clients')).toBe('/lawyer/help');
    expect(helpBase('/platform/overview')).toBe('/platform/help');
  });
});
describe('learning library', () => {
  it('lists tutorials and applies category filtering and debounced search', async () => {
    wrap(<HelpCenter />);
    expect(await screen.findByText('Managing clients')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', {
      name: /^Category/
    }), {
      target: {
        value: 'cat'
      }
    });
    fireEvent.change(screen.getByLabelText('Search tutorials'), {
      target: {
        value: 'Register'
      }
    });
    await waitFor(() => expect(tutorials.list).toHaveBeenLastCalledWith({
      search: 'Register',
      category: 'cat',
      page: 1
    }));
    expect(await screen.findByText('Chapter: Register client · 02:00')).toBeInTheDocument();
    expect(screen.getByRole('link', {
      name: /Managing clients/
    })).toHaveAttribute('href', '/admin/help/one?t=120');
  });
  it('handles empty results and hides management from firm admins', async () => {
    tutorials.list.mockResolvedValue({
      results: [],
      count: 0
    });
    wrap(<HelpCenter />);
    expect(await screen.findByText(/No tutorials are available/)).toBeInTheDocument();
    expect(screen.queryByText('Manage tutorials')).not.toBeInTheDocument();
  });
  it('shows platform management link', async () => {
    mocks.user = {
      role: 'PLATFORM_ADMIN'
    };
    wrap(<HelpCenter />);
    expect(screen.getByText('Manage tutorials')).toBeInTheDocument();
    await screen.findByText('Managing clients');
  });
  it('offers an explicit resume choice and expandable chapters', async () => {
    render(<MemoryRouter initialEntries={['/admin/help/one']}>
<Routes>
<Route path='/admin/help/:id' element={<TutorialDetail />} />
</Routes>
</MemoryRouter>);
    const resume = await screen.findByRole('button', {
      name: 'Resume from 01:20'
    });
    expect(screen.getByText('Chapters (2)').closest('details')).toHaveAttribute('open');
    fireEvent.click(resume);
    expect(screen.getByRole('button', {
      name: /Introduction/
    })).toHaveAttribute('aria-current', 'true');
    fireEvent.click(screen.getByRole('button', {
      name: /Register client/
    }));
    expect(screen.getByRole('button', {
      name: /Register client/
    })).toHaveAttribute('aria-current', 'true');
  });
});
describe('video API behavior', () => {
  it('loads only on request, seeks without reload, saves progress and handles errors', async () => {
    const seekTo = vi.fn(),
      destroy = vi.fn();
    let events;
    window.YT = {
      Player: vi.fn(function (_element, options) {
        events = options.events;
        return {
          seekTo,
          destroy,
          getIframe: () => document.createElement('iframe'),
          getCurrentTime: () => 120,
          getPlayerState: () => 2
        };
      })
    };
    const view = render(<VideoPlayer tutorial={tutorial} />);
    expect(window.YT.Player).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', {
      name: /Load video/
    }));
    await waitFor(() => expect(window.YT.Player).toHaveBeenCalledOnce());
    act(() => events.onReady());
    view.rerender(<VideoPlayer tutorial={tutorial} seek={{
      time: 120
    }} />);
    await waitFor(() => expect(seekTo).toHaveBeenCalledWith(120, true));
    expect(window.YT.Player).toHaveBeenCalledOnce();
    act(() => events.onStateChange({
      data: 2
    }));
    expect(tutorials.progress).toHaveBeenCalledWith('one', {
      position: 120,
      ranges: []
    });
    act(() => events.onError());
    expect(screen.getByRole('alert')).toHaveTextContent('Video unavailable');
    view.unmount();
    expect(destroy).toHaveBeenCalledOnce();
  });
  it('reports HTML5 playback errors', async () => {
    const {
      container
    } = render(<VideoPlayer tutorial={{
      ...tutorial,
      provider: 'html5',
      video_reference: 'https://media.example.test/a.mp4'
    }} />);
    fireEvent.click(screen.getByRole('button', {
      name: /Load video/
    }));
    fireEvent.error(container.querySelector('video'));
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to play');
  });
});
describe('administration', () => {
  it('denies firm administrators access to the editor', () => {
    wrap(<TutorialAdmin />);
    expect(screen.getByRole('alert')).toHaveTextContent('Platform administrator access');
  });
  it('creates a tutorial with timestamp chapters and publication state', async () => {
    mocks.user = {
      role: 'PLATFORM_ADMIN'
    };
    tutorials.save.mockResolvedValue({
      ...tutorial,
      status: 'published',
      slug: 'clients',
      chapters: [{
        id: 'a',
        title: 'Register',
        start: 120
      }],
      audiences: []
    });
    wrap(<TutorialAdmin />);
    await screen.findByRole('button', {
      name: /Managing clients/
    });
    fireEvent.change(screen.getByLabelText(/^Title/), {
      target: {
        value: 'Client guide'
      }
    });
    fireEvent.change(screen.getByLabelText(/^Slug/), {
      target: {
        value: 'client-guide'
      }
    });
    fireEvent.change(screen.getByRole('combobox', {
      name: /^Category/
    }), {
      target: {
        value: 'cat'
      }
    });
    fireEvent.change(screen.getByLabelText(/^YouTube URL \/ video ID or approved HTTPS video URL/), {
      target: {
        value: 'M7lc1UVf-VE'
      }
    });
    fireEvent.change(screen.getByLabelText('Publication status'), {
      target: {
        value: 'published'
      }
    });
    fireEvent.click(screen.getByRole('button', {
      name: 'Add chapter'
    }));
    fireEvent.change(screen.getByLabelText(/^Chapter 1 title/), {
      target: {
        value: 'Register'
      }
    });
    fireEvent.change(screen.getByLabelText(/^Start timestamp/), {
      target: {
        value: '02:00'
      }
    });
    fireEvent.click(screen.getByRole('button', {
      name: 'Save tutorial'
    }));
    await waitFor(() => expect(tutorials.save).toHaveBeenCalledWith(undefined, expect.objectContaining({
      status: 'published',
      chapters: [expect.objectContaining({
        start: 120,
        title: 'Register'
      })]
    })));
    expect(await screen.findByText('Tutorial saved.')).toBeInTheDocument();
  });
});

it('saves continuous playback at checkpoints and does not count a large seek', async () => {
  vi.useFakeTimers();
  let events, position = 0, state = 1;
  window.YT = {Player: vi.fn(function(_mount, options) {
    events = options.events;
    return {getIframe: () => document.createElement('iframe'), getCurrentTime: () => position, getPlayerState: () => state, seekTo: vi.fn(), destroy: vi.fn()};
  })};
  render(<VideoPlayer tutorial={tutorial} />);
  await act(async () => {fireEvent.click(screen.getByRole('button', {name: /Load video/}));});
  act(() => {events.onReady(); events.onStateChange({data: 1});});
  for (let i = 1; i <= 15; i++) {
    position = i;
    await act(async () => {vi.advanceTimersByTime(1000);});
  }
  expect(tutorials.progress).toHaveBeenCalledTimes(1);
  const first = tutorials.progress.mock.calls[0][1];
  expect(first.position).toBe(15);
  expect(first.ranges.reduce((sum, [a,b]) => sum + b-a, 0)).toBe(15);
  position = 299;
  await act(async () => {vi.advanceTimersByTime(1000);});
  state = 2;
  act(() => events.onStateChange({data: 2}));
  expect(tutorials.progress).toHaveBeenLastCalledWith('one', {position: 299, ranges: []});
  const count = tutorials.progress.mock.calls.length;
  await act(async () => {vi.advanceTimersByTime(30000);});
  expect(tutorials.progress).toHaveBeenCalledTimes(count);
});

it('saves the exact HTML5 pause position including the final playback interval', async () => {
  vi.useFakeTimers();
  const {container} = render(<VideoPlayer tutorial={{...tutorial,provider:'html5',video_reference:'https://media.example.test/tutorial.mp4'}} />);
  fireEvent.click(screen.getByRole('button',{name:/Load video/}));
  const video = container.querySelector('video');
  Object.defineProperty(video,'paused',{configurable:true,value:false});
  fireEvent.loadedMetadata(video);
  video.currentTime = 0;
  fireEvent.play(video);
  // A pause can arrive before the next sampling callback runs.
  vi.setSystemTime(Date.now() + 1000);
  video.currentTime = 1;
  Object.defineProperty(video,'paused',{configurable:true,value:true});
  await act(async () => {fireEvent.pause(video);});
  expect(tutorials.progress).toHaveBeenLastCalledWith('one',{position:1,ranges:[[0,1]]});
});

it('does not credit a short HTML5 seek as watched playback', async () => {
  vi.useFakeTimers();
  const {container} = render(<VideoPlayer tutorial={{...tutorial,provider:'html5',video_reference:'https://media.example.test/tutorial.mp4'}} />);
  fireEvent.click(screen.getByRole('button',{name:/Load video/}));
  const video = container.querySelector('video');
  Object.defineProperty(video,'paused',{configurable:true,value:false});
  fireEvent.loadedMetadata(video);
  fireEvent.play(video);
  await act(async () => {vi.advanceTimersByTime(1000);});
  fireEvent.seeking(video);
  video.currentTime = 2;
  fireEvent.seeked(video);
  Object.defineProperty(video,'paused',{configurable:true,value:true});
  await act(async () => {fireEvent.pause(video);});
  expect(tutorials.progress).toHaveBeenLastCalledWith('one',{position:2,ranges:[]});
});
