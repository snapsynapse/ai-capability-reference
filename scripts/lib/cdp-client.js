/**
 * Minimal Chrome DevTools Protocol client.
 * Zero external dependencies — WebSocket framing over built-in Node.js modules.
 *
 * Usage:
 *   const client = new CDPClient();
 *   await client.connect('ws://127.0.0.1:9222/devtools/page/...');
 *   const result = await client.send('Page.navigate', { url: '...' });
 *   client.on('Network.responseReceived', (params) => { ... });
 *   client.close();
 */

const http = require('http');
const crypto = require('crypto');
const { EventEmitter } = require('events');

/**
 * Encode a string as a masked WebSocket text frame.
 */
function encodeFrame(data) {
    const payload = Buffer.from(data, 'utf8');
    const mask = crypto.randomBytes(4);

    let header;
    if (payload.length < 126) {
        header = Buffer.alloc(6);
        header[0] = 0x81; // FIN + text
        header[1] = 0x80 | payload.length;
        mask.copy(header, 2);
    } else if (payload.length < 65536) {
        header = Buffer.alloc(8);
        header[0] = 0x81;
        header[1] = 0x80 | 126;
        header.writeUInt16BE(payload.length, 2);
        mask.copy(header, 4);
    } else {
        header = Buffer.alloc(14);
        header[0] = 0x81;
        header[1] = 0x80 | 127;
        header.writeUInt32BE(0, 2);
        header.writeUInt32BE(payload.length, 6);
        mask.copy(header, 10);
    }

    const masked = Buffer.alloc(payload.length);
    for (let i = 0; i < payload.length; i++) {
        masked[i] = payload[i] ^ mask[i & 3];
    }

    return Buffer.concat([header, masked]);
}

/**
 * Try to parse one WebSocket frame from a buffer.
 * Returns { fin, opcode, payload, remaining } or null if incomplete.
 */
function parseFrame(buffer) {
    if (buffer.length < 2) return null;

    const opcode = buffer[0] & 0x0f;
    let payloadLen = buffer[1] & 0x7f;
    let offset = 2;

    if (payloadLen === 126) {
        if (buffer.length < 4) return null;
        payloadLen = buffer.readUInt16BE(2);
        offset = 4;
    } else if (payloadLen === 127) {
        if (buffer.length < 10) return null;
        // Safe for lengths up to 2^53
        const hi = buffer.readUInt32BE(2);
        const lo = buffer.readUInt32BE(6);
        payloadLen = hi * 0x100000000 + lo;
        offset = 10;
    }

    if (buffer.length < offset + payloadLen) return null;

    const payload = buffer.slice(offset, offset + payloadLen);
    const remaining = buffer.slice(offset + payloadLen);

    return { opcode, payload, remaining };
}

class CDPClient extends EventEmitter {
    constructor() {
        super();
        this.socket = null;
        this._nextId = 1;
        this._pending = new Map();
        this._buffer = Buffer.alloc(0);
    }

    /**
     * Connect to a Chrome target via its WebSocket debugger URL.
     * @param {string} wsUrl - e.g. ws://127.0.0.1:9222/devtools/page/ABC123
     */
    connect(wsUrl) {
        return new Promise((resolve, reject) => {
            const url = new URL(wsUrl);
            const key = crypto.randomBytes(16).toString('base64');

            const req = http.request({
                hostname: url.hostname,
                port: url.port,
                path: url.pathname,
                headers: {
                    'Connection': 'Upgrade',
                    'Upgrade': 'websocket',
                    'Sec-WebSocket-Key': key,
                    'Sec-WebSocket-Version': '13'
                }
            });

            req.on('upgrade', (res, socket) => {
                const expected = crypto.createHash('sha1')
                    .update(key + '258EAFA5-E914-47DA-95CA-5AB5DC11E85A')
                    .digest('base64');

                if (res.headers['sec-websocket-accept'] !== expected) {
                    socket.destroy();
                    reject(new Error('WebSocket handshake failed'));
                    return;
                }

                this.socket = socket;
                socket.on('data', (data) => this._onData(data));
                socket.on('close', () => this.emit('close'));
                socket.on('error', (err) => this.emit('error', err));
                resolve();
            });

            req.on('error', reject);
            req.setTimeout(5000, () => {
                req.destroy();
                reject(new Error('Connection timeout'));
            });

            req.end();
        });
    }

    /** @private */
    _onData(data) {
        this._buffer = Buffer.concat([this._buffer, data]);

        let frame;
        while ((frame = parseFrame(this._buffer)) !== null) {
            this._buffer = frame.remaining;

            if (frame.opcode === 0x01) {
                // Text frame — CDP JSON message
                try {
                    const msg = JSON.parse(frame.payload.toString('utf8'));
                    if (msg.id !== undefined && this._pending.has(msg.id)) {
                        const { resolve, reject } = this._pending.get(msg.id);
                        this._pending.delete(msg.id);
                        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
                    } else if (msg.method) {
                        this.emit(msg.method, msg.params);
                    }
                } catch (e) {
                    // Malformed message — ignore
                }
            } else if (frame.opcode === 0x09) {
                // Ping — respond with pong
                const pong = Buffer.alloc(6);
                pong[0] = 0x8A;
                pong[1] = 0x80;
                crypto.randomBytes(4).copy(pong, 2);
                try { this.socket.write(pong); } catch (e) {}
            } else if (frame.opcode === 0x08) {
                // Close
                this.close();
            }
        }
    }

    /**
     * Send a CDP command and wait for the result.
     * @param {string} method - e.g. 'Page.navigate'
     * @param {Object} params
     * @param {number} timeout - ms (default 30000)
     * @returns {Promise<Object>}
     */
    send(method, params = {}, timeout = 30000) {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Not connected'));
                return;
            }

            const id = this._nextId++;
            const timer = setTimeout(() => {
                this._pending.delete(id);
                reject(new Error(`CDP timeout: ${method}`));
            }, timeout);

            this._pending.set(id, {
                resolve: (result) => { clearTimeout(timer); resolve(result); },
                reject: (err) => { clearTimeout(timer); reject(err); }
            });

            this.socket.write(encodeFrame(JSON.stringify({ id, method, params })));
        });
    }

    /**
     * Close the connection and reject any pending commands.
     */
    close() {
        if (this.socket) {
            const close = Buffer.alloc(6);
            close[0] = 0x88;
            close[1] = 0x80;
            crypto.randomBytes(4).copy(close, 2);
            try { this.socket.write(close); } catch (e) {}
            this.socket.destroy();
            this.socket = null;
        }

        for (const [, { reject }] of this._pending) {
            reject(new Error('Connection closed'));
        }
        this._pending.clear();
    }
}

module.exports = { CDPClient };
