Util = {
  // read in a LE word
  readWord: function (/*Stream*/ fs) {
    return ((fs.readByte () | (fs.readByte() << 8)));
  },

  // read in a LE doubleword
  readDWord: function (/*Stream*/ fs) {
    return (fs.readByte () | (fs.readByte() << 8) | (fs.readByte() << 16) | (fs.readByte() << 24) >>> 0);
  },

  // read in a byte
  readByte: function (/*Stream*/ fs) {
    return fs.readByte();
  },

  /// <summary>
  /// Make a magic number from the specified chars
  /// </summary>
  makeTag: function ()
  {
    if (arguments.length != 4)
      throw "we need 4 chars";

    return (arguments[0].charCodeAt(0) |
	    ((arguments[1].charCodeAt(0) << 8)>>>0) |
	    ((arguments[2].charCodeAt(0) << 16)>>>0) |
	    ((arguments[3].charCodeAt(0) << 24)>>>0));
  }
};
