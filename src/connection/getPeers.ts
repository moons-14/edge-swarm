import { isUint8Array } from "../utils/isUint8Array";
import { urlEncodeBytes } from "../utils/bufferEncode";
import bencode from 'bencode';

export type httpTrackerResponse = {
    complete: number;
    downloaded?: number;
    incomplete: number;
    interval: number;
    "min interval": number;
    peers:
    | Array<{
        ip: string | Uint8Array;
        port: number;
        "peer id": string | Uint8Array;
    }>
    | Uint8Array;
};

export type AnnounceResponse = {
    leechers: number;
    seeders: number;
    peers: Array<{ ip: string; port: number }>;
};


const buildAnnounceRequestUrl = (
    tracker: string,
    hash: string,
    id: string,
    port: string,
    uploaded: number,
    downloaded: number,
    left: number
) => {
    const hashBuffer = Buffer.from(hash, "hex");
    const announceUrl = new URL(tracker);
    announceUrl.searchParams.append("peer_id", id);
    announceUrl.searchParams.append("port", port);
    announceUrl.searchParams.append("uploaded", uploaded.toString());
    announceUrl.searchParams.append("downloaded", downloaded.toString());
    announceUrl.searchParams.append("left", left.toString());
    return `${announceUrl.toString()}&info_hash=${urlEncodeBytes(hashBuffer)}`;
}

const parseAnnounceResponse = (response: Buffer) => {
    const decodedResponse = bencode.decode(response) as httpTrackerResponse;

    if (
        !(
            "interval" in decodedResponse &&
            "peers" in decodedResponse
        )
    ) {
        throw new Error("Invalid response");
    }

    const peers: Array<{ ip: string; port: number; peerId?: string }> = [];
    if (isUint8Array(decodedResponse.peers)) {
        for (let i = 0; i < decodedResponse.peers.length; i += 6) {
            peers.push({
                ip: decodedResponse.peers.slice(i, i + 4).join("."),
                port: decodedResponse.peers
                    .slice(i + 4, i + 6)
                    .reduce((a, b) => a * 256 + b),
            });
        }
    } else {
        for (let i = 0; i < decodedResponse.peers.length; i++) {
            let ip: string;
            if (isUint8Array(decodedResponse.peers[i].ip)) {
                ip = String.fromCharCode(
                    ...(decodedResponse.peers[i].ip as Uint8Array),
                );
            } else {
                ip = decodedResponse.peers[i].ip as string;
            }

            let peerId: string;
            if (isUint8Array(decodedResponse.peers[i]["peer id"])) {
                peerId = String.fromCharCode(
                    ...(decodedResponse.peers[i]["peer id"] as Uint8Array),
                );
            } else {
                peerId = decodedResponse.peers[i]["peer id"] as string;
            }

            peers.push({
                ip,
                port: decodedResponse.peers[i].port,
                peerId,
            });
        }
    }

    return {
        interval: decodedResponse.interval,
        peers,
    };
}

export const getPeers = async (hash: string, id: string, port: string, trackers: string[], uploaded = 0, downloaded = 0, left = 0) => {
    const peers: {
        ip: string,
        port: number
    }[] = [];

    for (const tracker of trackers) {
        console.log('Getting peers from tracker:', tracker);
        const announceUrl = buildAnnounceRequestUrl(tracker, hash, id, port, uploaded, downloaded, left);
        try {
            const response = await fetch(announceUrl, { signal: AbortSignal.timeout(10000) });
            if (!response.ok) {
                console.error('Failed to get peers from tracker:', tracker);
                throw new Error('Failed to get peers from tracker');
            }
            const responseBuffer = Buffer.from(await response.arrayBuffer());
            const { interval, peers: _peers } = parseAnnounceResponse(responseBuffer);
            _peers.forEach(peer => {
                peers.push({
                    ip: peer.ip,
                    port: peer.port
                });
            });
        } catch (e: any) {
            console.error('Failed to get peers from tracker:', announceUrl, e.message);
        }
    }

    return peers;
}