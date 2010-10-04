if (!window.scsharp) scsharp = {};
if (!window.scsharp.smk) scsharp.smk = {};

scsharp.smk.Stream = function () {
  this.__defineGetter__ ("position", this.getPosition);
  this.__defineSetter__ ("position", this.setPosition);
};

scsharp.smk.Stream.prototype = {
  readByte: function () {
    throw "readByte not implemented";
  },

  read: function (bytes, offs, len) {
    throw "read not implemented";
  },

  getPosition: function () {
    throw "getPosition not implemented";
  },

  setPosition: function (p) {
    throw "setPosition not implemented";
  },

  seek: function (position, origin) {
    throw "seek not implemented";
  }
};

scsharp.smk.DataStream = function (d) {
  scsharp.smk.Stream.call (this); // chain up to ctor

  this.data = d;

  this.pos = 0;
};

scsharp.smk.DataStream.prototype = new scsharp.smk.Stream();

scsharp.smk.DataStream.prototype.readByte = function () {
  if (this.pos == this.data.length)
    throw "readByte out of range";

  return this.data[this.pos ++];
};

scsharp.smk.DataStream.prototype.read = function (bytes, offs, len) {
  for (var i = 0; i < len; i ++) {
    if (offs + i > bytes.length)
      return i - 1; /* should this be an error? */

    if (this.pos + 1 > this.data.length)
      return i - 1;

    bytes[offs + i] = this.data [ this.pos ++ ];
  }

  return len;
};

scsharp.smk.DataStream.prototype.getPosition = function () {
  return this.pos;
};

scsharp.smk.DataStream.prototype.setPosition = function (p) {
  if (p< 0 && p > this.data.length)
    throw "position out of range";

  this.pos = p;
};

scsharp.smk.DataStream.prototype.seek = function (offset, origin) {
  if (origin != "current" && origin != "begin")
    throw "invalid origin " + origin;

  var newPosition = offset;

  if (origin == "current")
    newPosition += this.pos;

  if (newPosition < 0 || newPosition > this.data.length)
    throw "new position for seek (" + offset + ", " + origin + ") out of range";

  this.pos = newPosition;
};