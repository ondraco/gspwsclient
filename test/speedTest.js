let host = "ws://127.0.0.1:80/API";
let key = "k4UuIfxe1ik=";
let readTagIds = [0];
let gws;

let total = 0;
let lastTotal = 0;
let start = 0;
let failed = false;

const channel = new BroadcastChannel("test-channel");

$(function () {
  test();
});

function test() {
  gws = new GSPClient.WS(host, key);
  gws.addEventListener("error", onError);
  gws.addEventListener("ready", onReady);
  gws.addEventListener("tagValue", onNewValue);
  gws.addEventListener("close", onClose);
  gws.connect();
}

function onReady(e) {
  channel.addEventListener("message", (e) => {
    total += e.data;
  });

  gws.setTagValues(tagValues);
  doSpeedTest();
}

function onNewValue(e) {
  validate(e);

  if (!failed) {
    total += e.length;
    channel.postMessage(e.length);
    gws.queryTagValues(readTagIds);
  }
}

function validate(e) {
  $.each(e, function (index, value) {
    if (value.val !== tagValues[value.tag - 1].val) {
      failed = true;
      console.log(
        " FAILED ON ID: " +
          value.tag +
          " VAL: " +
          value.val +
          " !== " +
          tagValues[value.tag - 1].val
      );
    }
  });
}

function doSpeedTest() {
  setInterval(function () {
    let delay = (Date.now() - start) / 1000;

    let rate = (total - lastTotal) / delay;
    console.log("COUNT: " + total + " RATE: " + rate + " tags/s");

    start = Date.now();
    lastTotal = total;
  }, 10000);

  start = Date.now();
  gws.queryTagValues(readTagIds);
}

function onClose(e) {
  console.log(e);
}

function onError(e) {
  if (e !== undefined) {
    console.log("ERR:" + e.msg + " - " + e.detail);
  } else {
    console.log(e);
  }
}

let tagValues = [250];
for (let i = 0; i < 250; ++i) {
  tagValues[i] = { tag: i + 1, val: i + 1 };
}
