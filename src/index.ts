import { Hono } from 'hono'
import parseTorrent from 'parse-torrent'
import * as ParseTorrentFile from 'parse-torrent-file'
import MagnetUri from 'magnet-uri'
import { restrictTrackerProtocol } from './connection/restrictTrackerProtocol'
import { getDefaultTrackers } from './connection/getDefaultTrackers'
import { getMyIp } from './connection/getMyIp'
import { genPeerIdString } from './connection/genPeerId'
import { getPeers } from './connection/getPeers'
import { getPortNumber } from './connection/getPortNumber'

const app = new Hono()

app.post('/register/file', async (c) => {
  const torrentFileBuffer = await c.req.arrayBuffer()
  let torrentFile: MagnetUri.Instance | ParseTorrentFile.Instance;
  try {
    torrentFile = await parseTorrent(Buffer.from(torrentFileBuffer))
  } catch (error) {
    return c.text('Invalid torrent file', 400)
  }
  console.log(torrentFile)

  // pickup the first 10 trackers
  const trackers = [...new Set([...restrictTrackerProtocol(torrentFile.announce ?? [], ['http:', 'https:']), ...restrictTrackerProtocol(getDefaultTrackers(c), ['http:', 'https:'])])].slice(0, 10);
  console.log('Trackers:', trackers);

  if(torrentFile.infoHash === undefined) {
    return c.text('Invalid torrent file: missing infoHash', 400)
  }

  if (trackers.length === 0) {
    return c.text('No trackers found in torrent file', 400)
  }

  const myIp = await getMyIp();

  const peerId = genPeerIdString();
  const peers = (await getPeers(torrentFile.infoHash, peerId, getPortNumber(c), trackers)).filter(p => p.ip !== myIp);

  console.log('Peers:', peers);



  return c.json({ peers })
})

export default app
