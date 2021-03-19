import { TextDecoder, TextEncoder } from "text-encoding";
import $ from "jquery";

const EventEmitter = require("events");
const WebSocket = require("isomorphic-ws");

export function WS(url, key) {
  // create fake DOM just so we can emit events
  var eventEmmiter = new EventEmitter();

  let _this = this;
  let socket;
  let authOk = false;

  const MsgId = {
    Authorize: 1,
    Get: 2,
    GetType: 3,
    Set: 4,
    Subscribe: 5,
    Unsubscribe: 6,
    RESULT_OK: 4000,
    RESULT_WRONG_FORMAT: 4001,
    RESULT_AUTH_FAILED: 4002,
    RESULT_ACCESS_DENIED: 4003,
    RESULT_ACCESS_DENIED_READ: 4004,
    RESULT_ACCESS_DENIED_WRITE: 4005,
  };

  this.TagType = {
    GspNone: 0,
    GspBit: 1,
    GspByte: 2,
    GspSByte: 3,
    GspWord: 4,
    GspSWord: 5,
    GspDWord: 6,
    GspSDWord: 7,
    GspFloat: 8,
    GspString: 9,
    GspError: 10,
  };

  this.addEventListener = function (name, callback) {
    eventEmmiter.on(name, callback);
  };

  this.removeEventListener = function (name, callback) {
    eventEmmiter.removeListener(name, callback);
  };

  let typeCache = [];
  let pendingValueSetRequests = [];
  let pendingValueRequests = [];
  let pendingTypeRequests = [];

  const closeEvent = "close";
  const errorEvent = "error";
  const readyEvent = "ready";
  const newTagValueEvent = "tagValue";
  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder();

  const tagIDBytes = 4;
  const headerSize = 4;

  this.IdNone = 0xffffffff;

  this.connect = function () {
    socket = new WebSocket(url, "gsp-protocol");
    socket.binaryType = "arraybuffer";

    socket.addEventListener("open", onOpen);
    socket.addEventListener("message", onMsg);
    socket.addEventListener("close", onClose);
    socket.addEventListener("error", onWsError);
  };

  function doAuth() {
    let headerLen = headerSize;
    let keySize = key.length;

    let arr = new ArrayBuffer(headerLen + keySize);
    let view = new DataView(arr, 0, headerLen + keySize);

    view.setInt16(0, MsgId.Authorize);
    view.setInt16(2, key.length);

    const u8View = new Int8Array(arr, 4);
    encodeIntoAtPosition(key, u8View);

    socket.send(arr);
  }

  function encodeIntoAtPosition(input, view, pos) {
    if (pos === undefined) {
      pos = 0;
    }

    let encoded = textEncoder.encode(input);

    for (let i = 0; i < encoded.length; ++i) {
      view[pos + i] = encoded[i];
    }

    return pos + encoded.length;
  }

  function decodeString(view) {
    return textDecoder.decode(view);
  }

  function onOpen(event) {
    doAuth();
  }

  function CheckAuth() {
    if (!authOk) {
      pushError("Not authenticated!");
      return false;
    }

    return true;
  }

  this.queryTagTypes = function (tagIdsArray) {
    if (!CheckAuth()) {
      return;
    }

    let tagsCount = tagIdsArray.length;
    let idsToRequest = [];

    for (let i = 0; i < tagsCount; ++i) {
      let id = tagIdsArray[i];
      if (pendingTypeRequests.indexOf(id) === -1) {
        idsToRequest.push(id);
      }
    }

    let headerLen = headerSize;
    tagsCount = idsToRequest.length;
    let bytes = headerLen + tagsCount * tagIDBytes;

    let arr = new ArrayBuffer(bytes);
    let view = new DataView(arr, 0, bytes);

    view.setInt16(0, MsgId.GetType);
    view.setInt16(2, tagsCount);

    for (let i = 0; i < tagsCount; ++i) {
      view.setInt32(headerLen + i * tagIDBytes, idsToRequest[i]);
      pendingTypeRequests.push(idsToRequest[i]);
    }

    socket.send(arr);
  };

  this.setTagValues = function (tagValuePairs) {
    if (!CheckAuth()) {
      return;
    }

    let uknownTagIds = [];

    for (let i = 0; i < tagValuePairs.length; ++i) {
      let pair = tagValuePairs[i];
      if (typeCache[pair.tag] === undefined) {
        uknownTagIds.push(pair.tag);
      }
    }

    if (uknownTagIds.length === 0) {
      sendSetRequest(tagValuePairs);
    } else {
      pendingValueSetRequests.push({
        pairs: tagValuePairs,
        types: uknownTagIds,
      });
      this.queryTagTypes(uknownTagIds);
    }
  };

  // Sends the request to change values
  // the type of all tags needs to be known at this point
  function sendSetRequest(tagValuePairs) {
    if (!CheckAuth()) {
      return;
    }

    let headerLen = headerSize;
    let tagsCount = tagValuePairs.length;
    let bytes = headerLen + tagsCount * tagIDBytes;

    for (let i = 0; i < tagsCount; ++i) {
      let pair = tagValuePairs[i];
      prepareForSend(pair);
      bytes += pair.size;
    }

    let arr = new ArrayBuffer(bytes);
    let view = new DataView(arr, 0, bytes);
    let pos = headerLen;

    view.setInt16(0, MsgId.Set);
    view.setInt16(2, tagsCount);

    // IDs
    for (let i = 0; i < tagsCount; ++i) {
      view.setInt32(pos, tagValuePairs[i].tag);
      pos += tagIDBytes;
    }

    let req = { arr: arr, view: view, pos: pos };

    for (let i = 0; i < tagsCount; ++i) {
      req.pair = tagValuePairs[i];
      serializeTagValue(req);
    }

    socket.send(arr);
  }

  function prepareForSend(pair) {
    let type = typeCache[pair.tag];

    switch (type) {
      case _this.TagType.GspString:
        pair.encoded = textEncoder.encode(pair.val);
        pair.size = pair.encoded.length + 4;
        break;
      case _this.TagType.GspBit:
      case _this.TagType.GspByte:
      case _this.TagType.GspSByte:
      case _this.TagType.GspWord:
      case _this.TagType.GspSWord:
      case _this.TagType.GspDWord:
      case _this.TagType.GspSDWord:
      case _this.TagType.GspError:
      case _this.TagType.GspFloat:
        pair.size = 4;
        break;

      default:
        pushError("Invalid tag type", "Type: " + type);
    }
  }

  function serializeTagValue(req) {
    let type = typeCache[req.pair.tag];

    switch (type) {
      case _this.TagType.GspString:
        writeStringValue(req.pair, req);
        break;
      case _this.TagType.GspBit:
      case _this.TagType.GspByte:
      case _this.TagType.GspSByte:
      case _this.TagType.GspWord:
      case _this.TagType.GspSWord:
      case _this.TagType.GspDWord:
      case _this.TagType.GspSDWord:
      case _this.TagType.GspError:
        writeNumericValue(req.pair, req);
        break;

      case _this.TagType.GspFloat:
        writeIEEE32Value(req.pair, req);
        break;

      default:
        pushError("Invalid tag type", "Type: " + type);
    }
  }

  this.subscribe = function (tagIdsArray) {
    if (!CheckAuth()) {
      return;
    }

    let headerLen = headerSize;
    let tagsCount = tagIdsArray.length;
    let bytes = headerLen + tagsCount * tagIDBytes;

    let arr = new ArrayBuffer(bytes);
    let view = new DataView(arr, 0, bytes);

    view.setInt16(0, MsgId.Subscribe);
    view.setInt16(2, tagsCount);

    for (let i = 0; i < tagsCount; ++i)
      view.setInt32(headerLen + i * tagIDBytes, tagIdsArray[i]);

    socket.send(arr);
  };

  this.unsubscribe = function (tagIdsArray) {
    if (!CheckAuth()) {
      return;
    }

    let headerLen = headerSize;
    let tagsCount = tagIdsArray.length;
    let bytes = headerLen + tagsCount * tagIDBytes;

    let arr = new ArrayBuffer(bytes);
    let view = new DataView(arr, 0, bytes);

    view.setInt16(0, MsgId.Unsubscribe);
    view.setInt16(2, tagsCount);

    for (let i = 0; i < tagsCount; ++i)
      view.setInt32(headerLen + i * tagIDBytes, tagIdsArray[i]);

    socket.send(arr);
  };

  this.queryTagValues = function (tagIdsArray) {
    if (!CheckAuth()) {
      return;
    }

    let headerLen = headerSize;
    let tagsCount = tagIdsArray.length;
    let bytes = headerLen + tagsCount * tagIDBytes;

    let arr = new ArrayBuffer(bytes);
    let view = new DataView(arr, 0, bytes);

    view.setInt16(0, MsgId.Get);
    view.setInt16(2, tagsCount);

    for (let i = 0; i < tagsCount; ++i)
      view.setInt32(headerLen + i * tagIDBytes, tagIdsArray[i]);

    socket.send(arr);
  };

  this.close = function () {
    socket.close();
  };

  function onMsg(event) {
    let data = event.data;
    let view = new DataView(data, 0, data.byteLength);

    let type = view.getInt16(0);
    switch (type) {
      case MsgId.Authorize:
        onAuthorizeResponse(view);
        break;
      case MsgId.Get:
        onReceivedValues(data, view, 2);
        break;
      case MsgId.GetType:
        onReceivedTypes(view, 2);
        break;
      case MsgId.RESULT_ACCESS_DENIED_READ:
        onAccessDeniedRead(view, 2);
        break;
      case MsgId.RESULT_ACCESS_DENIED_WRITE:
        onAccessDeniedWrite(view, 2);
        break;
    }
  }

  function onAccessDeniedRead(view, pos) {
    if (view.byteLength - pos < 2)
      pushError("Malformed communication", "RESULT_ACCESS_DENIED_READ");

    let tagCount = view.getInt16(pos);
    pos += 2;

    if (view.byteLength - pos < tagCount * 4)
      pushError("Failed to authenticate", "Malformed get tag type response.");
    let ids = [];

    // IDs
    for (let i = 0; i < tagCount; ++i) {
      let id = view.getInt32(pos);
      pos += 4;
      ids.push(id);
    }

    pushError("ACCESS_DENIED_READ", ids);
  }

  function onAccessDeniedWrite(view, pos) {
    if (view.byteLength - pos < 2)
      pushError("Malformed communication", "RESULT_ACCESS_DENIED_WRITE");

    let tagCount = view.getInt16(2);
    pos += 2;

    if (view.byteLength - pos < tagCount * 4)
      pushError("Malformed communication", "RESULT_ACCESS_DENIED_WRITE");
    let ids = [];

    // IDs
    for (let i = 0; i < tagCount; ++i) {
      let id = view.getInt32(pos);
      pos += 4;
      ids.push(id);
    }

    pushError("RESULT_ACCESS_DENIED_WRITE", ids);
  }

  function onReceivedTypes(view, pos) {
    if (view.byteLength - pos < 2)
      pushError("Failed to authenticate", "Malformed get tag type response.");

    let tagCount = view.getInt16(pos);
    pos += 2;

    if (view.byteLength - pos < tagCount * 8)
      pushError("Failed to authenticate", "Malformed get tag type response.");

    let newTypes = [];
    let ids = [];

    // IDs
    for (let i = 0; i < tagCount; ++i) {
      let id = view.getInt32(pos);
      pos += 4;
      ids.push(id);
    }

    // Types
    for (let i = 0; i < tagCount; ++i) {
      let id = ids[i];

      let typeId = view.getInt32(pos);
      pos += 4;

      typeCache[id] = typeId;
      newTypes.push(id);
    }

    checkPendingValueRequests(newTypes);
  }

  function checkPendingValueRequests(newTypes) {
    checkPendingSetValueRequests(newTypes);
    checkPendingGetValueRequests(newTypes);
  }

  function checkPendingSetValueRequests(newTypes) {
    if (pendingValueSetRequests.length === 0) {
      return;
    }

    let notHandled = [];

    for (let i = 0; i < pendingValueSetRequests.length; ++i) {
      let req = pendingValueSetRequests[i];

      let missingType = false;
      for (let i = 0; i < req.types.length; ++i) {
        if (typeCache[req.types[i]] === undefined) {
          missingType = true;
          break;
        }
      }
      if (!missingType) {
        sendSetRequest(req.pairs);
      } else {
        notHandled.push(req);
      }

      pendingValueSetRequests = notHandled;
    }
  }

  function checkPendingGetValueRequests(newTypes) {
    if (pendingValueRequests.length === 0) {
      return;
    }

    let notHandled = [];

    for (let i = 0; i < pendingValueRequests.length; ++i) {
      let req = pendingValueRequests[i];

      let missingType = false;
      for (let i = 0; i < req.types.length; ++i) {
        if (typeCache[req.types[i]] === undefined) {
          missingType = true;
          break;
        }
      }
      if (!missingType) {
        readTagValues(req);
      } else {
        notHandled.push(req);
      }

      pendingValueRequests = notHandled;
    }
  }

  function readTagValues(req) {
    let values = [];

    for (let i = 0; i < req.tags.length; ++i) {
      readTagValue(req.tags[i], req, values);
    }

    eventEmmiter.emit(newTagValueEvent, values);
  }

  function readTagValue(tag, req, values) {
    let type = typeCache[tag];

    switch (type) {
      case _this.TagType.GspString:
        readStringValue(tag, req, values);
        break;
      case _this.TagType.GspBit:
      case _this.TagType.GspByte:
      case _this.TagType.GspSByte:
      case _this.TagType.GspWord:
      case _this.TagType.GspSWord:
      case _this.TagType.GspDWord:
      case _this.TagType.GspSDWord:
      case _this.TagType.GspError:
        readNumericValue(tag, req, values);
        break;

      case _this.TagType.GspFloat:
        readIEEE32Value(tag, req, values);
        break;

      default:
        pushError("Invalid tag type", "Type: " + type);
    }
  }

  function readNumericValue(tag, req, values) {
    let val = req.view.getInt32(req.pos);
    req.pos += 4;

    values.push({ tag: tag, val: val, type: typeCache[tag] });
  }

  function writeNumericValue(pair, req) {
    req.view.setInt32(req.pos, pair.val);
    req.pos += 4;
  }

  function readIEEE32Value(tag, req, values) {
    let val = req.view.getFloat32(req.pos);
    req.pos += 4;

    values.push({ tag: tag, val: val, type: typeCache[tag] });
  }

  function writeIEEE32Value(pair, req) {
    req.view.setFloat32(req.pos, pair.val);
    req.pos += 4;
  }

  function readStringValue(tag, req, values) {
    let chars = req.view.getInt32(req.pos);
    req.pos += 4;

    const u8View = new Int8Array(req.arr, req.pos, chars);
    let val = decodeString(u8View);
    req.pos += chars;

    values.push({ tag: tag, val: val, type: typeCache[tag] });
  }

  function writeStringValue(pair, req) {
    // string length
    req.view.setInt32(req.pos, pair.encoded.length);
    req.pos += 4;

    let view = new Int8Array(req.arr, req.pos, pair.encoded.length);
    for (let i = 0; i < pair.encoded.length; ++i) {
      view[i] = pair.encoded[i];
    }
    req.pos += pair.encoded.length;
  }

  function onReceivedValues(arr, view, pos) {
    let tagCount = view.getInt16(pos);
    pos += 2;

    let tags = [];
    var data = { view: view, pos: pos };
    let missingTypes = [];

    for (let i = 0; i < tagCount; ++i) {
      let id = view.getInt32(pos);
      pos += 4;

      let type = typeCache[id];
      tags.push(id);

      if (type === undefined) {
        missingTypes.push(id);
      }
    }

    let req = {
      types: missingTypes,
      tags: tags,
      arr: arr,
      view: view,
      pos: pos,
    };

    if (missingTypes.length !== 0) {
      pendingValueRequests.push(req);
      _this.queryTagTypes(missingTypes);
    } else {
      readTagValues(req);
    }
  }

  function onAuthorizeResponse(response) {
    let bytes = response.byteLength;

    if (bytes != 4)
      pushError(
        "Failed to authenticate",
        "Auth response has to be 4 bytes long!"
      );

    let isOk = response.getInt16(2);

    if (isOk) {
      authOk = true;
      eventEmmiter.emit(readyEvent);
    } else {
      authOk = false;
      pushError("Failed to authenticate", "Invalid API key.");
      _this.close();
    }
  }

  function pushError(msg, detail) {
    eventEmmiter.emit(errorEvent, { msg: msg, detail: detail });
  }

  function onClose(e) {
    eventEmmiter.emit(closeEvent, e);
  }

  function onWsError(error) {
    pushError("WS error", error);
    _this.close();
  }
}
