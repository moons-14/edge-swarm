import crypto from 'crypto';

export const getHandshakeMessage = (
    infoHash: Uint8Array,
    peerId: Uint8Array
) => {
    const protocolString = Buffer.from('BitTorrent protocol', 'utf-8')
    const length = Buffer.from(protocolString.length.toString(16), 'hex')
    const reserved = Buffer.from('0000000000100001', 'hex') // extended flag
    const random = crypto.randomBytes(12)
    return Buffer.concat([length, protocolString, reserved, infoHash, peerId, random])
}