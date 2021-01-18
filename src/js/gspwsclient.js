function GspWs(url, key) {
  var eventTarget = document.createTextNode(null);

  let _this = this;
  let socket;
  let authOk = false;

  const MsgId = {
    Authorize: 1,
    Get: 2,
    Set: 3,
    Sub: 4,
  };

  this.addEventListener = eventTarget.addEventListener.bind(eventTarget);
  this.removeEventListener = eventTarget.removeEventListener.bind(eventTarget);
  this.dispatchEvent = eventTarget.dispatchEvent.bind(eventTarget);

  const errorEvent = "error";

  this.connect = function () {
    socket = new WebSocket(url, "gsp-protocol");
    socket.binaryType = "arraybuffer";

    socket.addEventListener("open", onOpen);
    socket.addEventListener("message", onMsg);
    socket.addEventListener("close", onClose);
    socket.addEventListener("error", onError);
  };

  function doAuth() {
    let headerLen = 4;
    let keySize = key.length * 2;

    let arr = new ArrayBuffer(headerLen + keySize);
    let view = new DataView(arr, 0, headerLen + keySize);

    view.setInt16(0, MsgId.Authorize);
    view.setInt16(2, key.length);

    for (let i = 0, strLen = key.length; i < strLen; i++) {
      view.setInt16(4 + i * 2, key.charCodeAt(i));
    }

    socket.send(arr);
  }

  function onOpen(event) {
    doAuth();
  }

  function onMsg(event) {
    let data = event.data;
    let view = new DataView(data, 0, data.byteLength);

    let type = view.getInt16(0);
    switch (type) {
      case MsgId.Authorize:
        onAuthorizeResponse(view);
        break;
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
      _this.authOk = true;
    } else {
      _this.authOk = false;
      pushError(
        "Failed to authenticate",
        "Invalid API key."
      );
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
