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
import { connect } from 'cloudflare:sockets';
import { getHandshakeMessage } from './download/getHandshakeMessage'

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

  if (torrentFile.infoHash === undefined || torrentFile.infoHashBuffer === undefined) {
    return c.text('Invalid torrent file: missing infoHash', 400)
  }

  if (trackers.length === 0) {
    return c.text('No trackers found in torrent file', 400)
  }

  const myIp = await getMyIp();

  const peerId = genPeerIdString();
  const peers = (await getPeers(torrentFile.infoHash, peerId, getPortNumber(c), trackers)).filter(p => p.ip !== myIp).filter(p => !p.ip.match(/:/))

  console.log('Peers:', peers);

  if (peers.length === 0) {
    return c.text('No peers found', 200)
  }

  // test connect to first peer
  const { ip, port } = peers[0];
  try {
    const socket = connect({ hostname: ip, port });
    const socketInfo = await socket.opened;

    console.log('Connected to:', socketInfo);

    const writer = socket.writable.getWriter();
    const reader = socket.readable.getReader();

    // handshake
    await writer.write(getHandshakeMessage(torrentFile.infoHashBuffer, Buffer.from(peerId)));

   while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('Stream closed');
        break;
      }

      console.log('Received data:', value);
      break;
    }

    socket.close();
  } catch (err) {
    console.error('Failed to connect to peer:', ip, port, err);
    return c.text('Failed to connect to peer', 500)
  }

  return c.json({ peers })
})

export default app
