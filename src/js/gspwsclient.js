function GspWs(url, key) {
  // create fake DOM just so we can emit events
  var eventTarget = document.createTextNode(null);

  let _this = this;
  let socket;
  let authOk = false;

  const MsgId = {
    Authorize: 1,
    Get: 2,
    GetType: 3,
    Set: 4,
    Sub: 5,
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

  this.addEventListener = eventTarget.addEventListener.bind(eventTarget);
  this.removeEventListener = eventTarget.removeEventListener.bind(eventTarget);
  this.dispatchEvent = eventTarget.dispatchEvent.bind(eventTarget);

  let typeCache = [];
  let pendingValueRequests = [];
  let pendingTypeRequests = [];

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
    socket.addEventListener("error", onError);
  };

  function doAuth() {
    let headerLen = headerSize;
    let keySize = key.length * 2;

    let arr = new ArrayBuffer(headerLen + keySize);
    let view = new DataView(arr, 0, headerLen + keySize);

    view.setInt16(0, MsgId.Authorize);
    view.setInt16(2, key.length);

    const u8View = new Int8Array(arr, 4);
    encodeIntoAtPosition(key, u8View);

    socket.send(arr);
  }

  function encodeIntoAtPosition(input, view, pos = 0) {
    let encoded = textEncoder.encode(input);

    for (let i = 0; i < encoded.length; ++i) {
      view[pos + i] = encoded[i];
    }
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
      if (!pendingTypeRequests.includes(tagIdsArray[i])) {
        idsToRequest.push(tagIdsArray[i]);
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

  function close() {
    socket.close();
  }

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
    }
  }

  function onReceivedTypes(view, pos) {
    let bytes = view.byteLength - pos;

    if (bytes < 2)
      pushError("Failed to authenticate", "Malformed get tag type response.");

    let tagCount = view.getInt16(pos);
    pos += 2;

    if (bytes < tagCount * 8)
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
    if (pendingValueRequests.length === 0) {
      return;
    }

    let notHandled = [];

    for (let i = 0; i < pendingValueRequests.length; ++i) {
      let req = pendingValueRequests[i];

      if (req.types.every((x) => typeCache[x] !== undefined)) {
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

    const event = new CustomEvent(newTagValueEvent, {
      detail: values,
    });
    _this.dispatchEvent(event);
  }

  function readTagValue(tag, req, values) {
    let type = typeCache[tag];

    switch (type) {
      case _this.TagType.GspString:
        readStringValue(tag, req, values);
        break;
      case _this.TagType.GspBit:
      case _this.TagType.GspSByte:
      case _this.TagType.GspWord:
      case _this.TagType.GspSWord:
      case _this.TagType.GspDWord:
      case _this.TagType.GspSDWord:
      case _this.TagType.GspFloat:
      case _this.TagType.GspError:
        readNumericValue(tag, req, values);
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

  function readStringValue(tag, req, values) {
    let chars = req.view.getInt32(req.pos);
    req.pos += 4;
    
    const u8View = new Int8Array(req.arr, req.pos, chars);
    let val = decodeString(u8View);

    values.push({ tag: tag, val: val, type: typeCache[tag] });
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

    if (missingTypes.length !== 0) {
      let pendingReq = {
        types: missingTypes,
        tags: tags,
        arr: arr,
        view: view,
        pos: pos,
      };

      pendingValueRequests.push(pendingReq);
      _this.queryTagTypes(missingTypes);
    } else {
      readTagValues(tags, view, pos);
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
      const event = new CustomEvent(readyEvent);
      _this.dispatchEvent(event);
    } else {
      authOk = false;
      pushError("Failed to authenticate", "Invalid API key.");
      close();
    }
  }

  function pushError(msg, detail) {
    const event = new CustomEvent(errorEvent, {
      detail: { msg: msg, detail: detail },
    });
    _this.dispatchEvent(event);
  }

  function onClose(event) {
    console.log(event);
  }

  function onError(error) {
    const event = new Event(errorEvent, error);
    _this.dispatchEvent(event);
  }
}
