let host = "ws://192.168.1.130/API";
let key = "4mM7qhB2I1w=";
let readTagIds = [0];
let gws;
let handled = 0;
let start = 0;
let failed = false;

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
  gws.setTagValues(tagValues);
  doSpeedTest();
}

function onNewValue(e) {
  validate(e);

  if (!failed) {
    handled += e.length;
    gws.queryTagValues(readTagIds);
  }
}

function validate(e) {
  $.each(e, function (index, value) {
    if (expectedValues[value.tag].val !== value.val) {
      failed = true;
      console.log(
        " FAILED ON ID: " +
          value.tag +
          " VAL: " +
          value.val +
          " !== " +
          expectedValues[value.tag].val
      );
    }
  });
}

function doSpeedTest() {
  setInterval(function () {
    let delay = (Date.now() - start) / 1000;
    let rate = handled / delay;
    console.log("COUNT: " + handled + " RATE: " + rate + " tags/s");
  }, 1000);

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

let tagValues = [
  // BIT0
  { tag: 2, val: 1 },
  { tag: 3, val: 0 },
  { tag: 4, val: 1 },
  { tag: 5, val: 0 },
  { tag: 6, val: 1 },
  { tag: 7, val: 0 },
  { tag: 8, val: 1 },
  { tag: 9, val: 0 },
  { tag: 10, val: 1 },
  { tag: 11, val: 0 },
  // BYTE0
  { tag: 13, val: 1 },
  { tag: 14, val: 2 },
  { tag: 15, val: 3 },
  { tag: 16, val: 4 },
  { tag: 17, val: 5 },
  { tag: 18, val: 6 },
  { tag: 19, val: 7 },
  { tag: 20, val: 8 },
  { tag: 21, val: 9 },
  { tag: 22, val: 10 },
];

let expectedValues = [];
$.each(tagValues, function (index, value) {
    expectedValues[value.tag] = value;
});
