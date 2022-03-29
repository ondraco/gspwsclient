let host = "ws://127.0.0.1:80/API";
let key = "k4UuIfxe1ik=";
let readTagIds = [0];
let newTagValues = [
  {
    tag: 1,
    val: 0,
  },
  {
    tag: 2,
    val: 22,
  },
  {
    tag: 3,
    val: 222,
  },
  {
    tag: 4,
    val: 4444,
  },
  {
    tag: 5,
    val: 7.654321,
  },
  {
    tag: 6,
    val: "New-Text",
  },
  {
    tag: 7,
    val: 1113.225151751,
  },
  {
    tag: 8,
    val: BigInt(20000000000063),
  },
];
let gws;
let handled = 0;

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

function onNewValue(e) {
  handled += e.length;
  $.each(e, function (index, value) {
    console.log(
      "ID: " + value.tag + " TYPE: " + value.type + " VAL: " + value.val
    );
  });
}

function onReady(e) {
  gws.queryTagValues(readTagIds);
  gws.subscribe(readTagIds);
  gws.setTagValues(newTagValues);
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