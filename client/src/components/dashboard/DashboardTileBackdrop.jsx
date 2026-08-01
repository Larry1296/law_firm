import { useEffect, useRef, useState } from 'react';

import sceneSet1 from '@/assets/images/dashboard/legal-dashboard-scenes-1.png';
import sceneSet2 from '@/assets/images/dashboard/legal-dashboard-scenes-2.png';
import sceneSet3 from '@/assets/images/dashboard/legal-dashboard-scenes-3.png';
import sceneSet4 from '@/assets/images/dashboard/legal-dashboard-scenes-4.png';

const SCENE_SETS = [sceneSet1, sceneSet2, sceneSet3, sceneSet4];
const SCENE_ASPECTS = [1672 / 941, 1536 / 1024, 1672 / 941, 1536 / 1024];

// Each source image is a 4 × 4 sheet. Variants sharing a real-world context
// intentionally reuse the same photographic scene rather than a generic icon.
const SCENE_POSITION = {
  light: [0, 0],
  cases: [0, 0],
  clients: [1, 0],
  staff: [2, 0],
  courtroom: [3, 0],
  hearings: [3, 0],

  finance: [0, 1],
  revenue: [0, 1],
  billing: [1, 1],
  documents: [2, 1],
  tasks: [3, 1],

  messages: [0, 2],
  communication: [0, 2],
  lawyerContacts: [1, 2],
  calendar: [2, 2],
  notifications: [3, 2],

  ai: [0, 3],
  analytics: [1, 3],
  reports: [1, 3],
  activities: [2, 3],
  activity: [2, 3],
  compliance: [3, 3],
  settings: [3, 3],
  glass: [0, 0],
};

export default function DashboardTileBackdrop({ variant }) {
  const [sceneState, setSceneState] = useState({ current: 0, previous: null });
  const [tileSize, setTileSize] = useState({ width: 0, height: 0 });
  const backdropRef = useRef(null);
  const [column, row] = SCENE_POSITION[variant] || SCENE_POSITION.light;

  useEffect(() => {
    const element = backdropRef.current;
    if (!element) return undefined;

    const updateAspect = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width && height) setTileSize({ width, height });
    };

    updateAspect();
    const observer = new ResizeObserver(updateAspect);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let timeoutId;

    const scheduleNextScene = () => {
      const delay = 4200 + Math.random() * 2600;

      timeoutId = window.setTimeout(() => {
        setSceneState(({ current }) => {
          const offset = 1 + Math.floor(Math.random() * (SCENE_SETS.length - 1));
          return {
            previous: current,
            current: (current + offset) % SCENE_SETS.length,
          };
        });
        scheduleNextScene();
      }, delay);
    };

    scheduleNextScene();

    return () => window.clearTimeout(timeoutId);
  }, []);

  const getSceneStyle = (sceneIndex) => {
    const sourceAspect = SCENE_ASPECTS[sceneIndex];
    const tileAspect = tileSize.height ? tileSize.width / tileSize.height : 1;
    const sizeByWidth = tileAspect > sourceAspect;
    const cellWidth = sizeByWidth
      ? tileSize.width
      : tileSize.height * sourceAspect;
    const cellHeight = sizeByWidth
      ? tileSize.width / sourceAspect
      : tileSize.height;
    const sceneLeft = (tileSize.width - cellWidth) / 2 - column * cellWidth;
    const sceneTop = (tileSize.height - cellHeight) / 2 - row * cellHeight;

    return {
      backgroundImage: `url(${SCENE_SETS[sceneIndex]})`,
      backgroundPosition: `${sceneLeft}px ${sceneTop}px`,
      backgroundSize: `${cellWidth * 4}px ${cellHeight * 4}px`,
    };
  };

  return (
    <div
      ref={backdropRef}
      className='pointer-events-none absolute inset-0 overflow-hidden'
      aria-hidden='true'
    >
      {sceneState.previous !== null && (
        <div
          className='dashboard-tile-photo absolute inset-0'
          style={getSceneStyle(sceneState.previous)}
        />
      )}
      <div
        key={`${variant}-${sceneState.current}`}
        className='dashboard-tile-photo dashboard-tile-photo-current absolute inset-0'
        style={getSceneStyle(sceneState.current)}
      />

      <div className='absolute inset-0 bg-gradient-to-r from-black/60 via-black/35 to-black/10' />
      <div className='absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent' />
      <div className='dashboard-tile-sheen absolute -inset-y-1/2 left-[-45%] w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/15 to-transparent blur-sm' />

      <div className='absolute bottom-5 right-5 flex gap-1.5 rounded-full border border-white/20 bg-black/25 px-2.5 py-2 shadow-lg backdrop-blur-md'>
        {SCENE_SETS.map((_, index) => (
          <span
            key={`${variant}-scene-${index}`}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              index === sceneState.current ? 'w-6 bg-white' : 'w-1.5 bg-white/45'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
