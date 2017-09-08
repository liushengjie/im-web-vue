var socket = void 0,
    session = {},
    ID_SEQ = 1;
var config = { listener: null, log: console };

var listener = {
    onOpened: function onOpened(event) {
        if (config.listener != null) {
            config.listener.onOpened(event);
        }
        handshake();
    },
    onClosed: function onClosed(event) {
        if (config.listener != null) {
            config.listener.onClosed(event);
        }
        session = {};
        ID_SEQ = 1;
        socket = null;
    },
    onHandshake: function onHandshake() {
        session.handshakeOk = true;
        if (config.listener != null) {
            config.listener.onHandshake();
        }
        if (config.userId) {
            bindUser(config.userId, config.tags);
        }
    },
    onBindUser: function onBindUser(success) {
        if (config.listener != null) {
            config.listener.onBindUser(success);
        }
    },
    onReceivePush: function onReceivePush(message, messageId) {
        if (config.listener != null) {
            config.listener.onReceivePush(message, messageId);
        }
        console.log(message)
    },
    onKickUser: function onKickUser(userId, deviceId) {
        if (config.listener != null) {
            config.listener.onKickUser(userId, deviceId);
        }
        doClose(-1, "kick user");
    }
};

var Command = {
    HANDSHAKE: 2,
    BIND: 5,
    UNBIND: 6,
    ERROR: 10,
    OK: 11,
    KICK: 13,
    PUSH: 15,
    ACK: 23,
    UNKNOWN: -1
};

function Packet(cmd, body, sessionId) {
    return {
        cmd: cmd,
        flags: 16,
        sessionId: sessionId || ID_SEQ++,
        body: body
    };
}

function handshake() {
    send(Packet(Command.HANDSHAKE, {
        deviceId: config.deviceId,
        osName: config.osName,
        osVersion: config.osVersion,
        clientVersion: config.clientVersion
    }));
}

function bindUser(userId, tags) {
    if (userId && userId != session.userId) {
        session.userId = userId;
        session.tags = tags;
        send(Packet(Command.BIND, { userId: userId, tags: tags }));
    }
}

function ack(sessionId) {
    send(Packet(Command.ACK, null, sessionId));
}

function send(message) {
    if (!socket) {
        return;
    }
    if (socket.readyState == WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
    } else {
        config.log.error("The socket is not open.");
    }
}

function dispatch(packet) {
    switch (packet.cmd) {
        case Command.HANDSHAKE:
            {
                console.log(">>> handshake ok.");
                listener.onHandshake();
                break;
            }
        case Command.OK:
            {
                if (packet.body.cmd == Command.BIND) {
                    console.log(">>> bind user ok.");
                    listener.onBindUser(true);
                }
                break;
            }
        case Command.ERROR:
            {
                if (packet.body.cmd == Command.BIND) {
                    console.log(">>> bind user failure.");
                    listener.onBindUser(false);
                }
                break;
            }

        case Command.KICK:
            {
                if (session.userId == packet.body.userId && config.deviceId == packet.body.deviceId) {
                    console.log(">>> receive kick user.");
                    listener.onKickUser(packet.body.userId, packet.body.deviceId);
                }
                break;
            }

        case Command.PUSH:
            {
                console.log(">>> receive push, content=" + packet.body.content);
                var sessionId = void 0;
                if ((packet.flags & 8) != 0) {
                    ack(packet.sessionId);
                } else {
                    sessionId = packet.sessionId;
                }
                listener.onReceivePush(packet.body.content, sessionId);
                break;
            }
    }
}

function onReceive(event) {
    console.log(">>> receive packet=" + event.data);
    dispatch(JSON.parse(event.data));
}

function onOpen(event) {
    console.log("Web Socket opened!");
    listener.onOpened(event);
}

function onClose(event) {
    console.log("Web Socket closed!");
    listener.onClosed(event);
}

function onError(event) {
    console.log("Web Socket receive, error");
    doClose();
}

function doClose(code, reason) {
    if (socket) socket.close();
    console.log("try close web socket client, reason=" + reason);
}

function doConnect(cfg) {
    config = copy(cfg);
    socket = new WebSocket(config.url);
    socket.onmessage = onReceive;
    socket.onopen = onOpen;
    socket.onclose = onClose;
    socket.onerror = onError;
    console.log("try connect to web socket server, url=" + config.url);
}

function copy(cfg) {
    for (var p in cfg) {
        if (cfg.hasOwnProperty(p)) {
            config[p] = cfg[p];
        }
    }
    return config;
}

export const push = {
    connect: doConnect,
    close: doClose,
    bindUser: bindUser
};