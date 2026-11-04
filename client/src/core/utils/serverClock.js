// The server's clock, read from each API response's Date header, so forms date what they record by the
// server rather than by a device whose clock may be wrong.
let offset = 0;

export const syncServerClock = (dateHeader) => {
  const serverTime = Date.parse(dateHeader || '');
  if (!Number.isNaN(serverTime)) offset = serverTime - Date.now();
};

export const serverNow = () => new Date(Date.now() + offset);
