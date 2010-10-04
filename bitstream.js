if (!window.scsharp) scsharp = {};
if (!window.scsharp.smk) scsharp.smk = {};

scsharp.smk.BitStream = function (/*Stream*/ sourceStream) {
  var mCurrentByte = 0;
  var mCurrentBit = 0;
  var nbBytes = 0;

  // Raising this value causes more bytes to be cached in the stream and reduces the number of accesses to disk
  var MAX_BYTES = 512;
  var bytes = new Array (MAX_BYTES);

  this.getBaseStream = function () {
    return sourceStream;
  };

  //This method needs to be lightning fast: it's run thousends of time when decoding an SMK Frame.
  this.readBits = function (/*int*/ bitCount) {
    if (bitCount > 16)
      throw "Maximum bitCount is 16";

    //We need bitCount bits
    var result = 0;
    var bitsRead = 0;
    while (bitCount > 0) {
      if (mCurrentByte >= nbBytes) {
        if (sourceStream.position >= sourceStream.length)
          throw "end of stream";
        nbBytes = sourceStream.read(bytes, 0, MAX_BYTES);
          mCurrentByte = 0;
        mCurrentBit = 0;
      }

      if (mCurrentBit + bitCount < 8)  { //Everything fits in this byte
        result |= ((bytes[mCurrentByte] >> mCurrentBit) & (0xffff >> (16 - bitCount))) << bitsRead;
        mCurrentBit = bitCount + mCurrentBit;
        bitCount = 0;
      }
      else { //Read all bits left in this byte
        var bitsToRead = 8 - mCurrentBit;
        result |= ((bytes[mCurrentByte] >> mCurrentBit) & (0xffff >> (16 - bitsToRead))) << bitsRead;
        bitsRead += bitsToRead;
        mCurrentByte++;
        mCurrentBit = 0;
        bitCount -= bitsToRead;
      }
    }

    return result;
  };

  this.reset = function () {
    sourceStream.seek(0, "begin");
    mCurrentByte = 0;
    mCurrentBit = 0;
  };
};