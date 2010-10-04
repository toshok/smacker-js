if (!window.scsharp) scsharp = {};
if (!window.scsharp.smk) scsharp.smk = {};

scsharp.smk.SmackerFile = function (/*Stream*/ stream) {

  // SmackerHeader header
  this.header = null;

  // UInt32[] frameSizes
  this.frameSizes = null;

  // byte[] frameTypes
  this.frameTypes = null;

  // bool isV4
  this.isV4 = false;

  // BigHuffmanTrees
  this.mMap = null;
  this.mClr = null;
  this.full = null;
  this.type = null;

  // Stream stream
  this.stream = null;

  this.readHeader = function (/*Stream*/ s ) {
    var smk = new scsharp.smk.SmackerHeader();
    var i;

    /* read and check header */
    smk.signature = Util.readDWord(s);
    if (smk.signature != Util.makeTag("S", "M", "K", "2") && smk.signature != Util.makeTag("S", "M", "K", "4"))
      throw "Not an SMK stream";

    smk.width = Util.readDWord(s);
    smk.height = Util.readDWord(s);
    smk.nbFrames = Util.readDWord(s);
    smk.pts_Inc = Util.readDWord(s) & 0xffffffff;
    smk.fps = this.calcFps(smk);
    smk.flags = Util.readDWord(s);
    for (i = 0; i < 7; i++)
      smk.audioSize[i] = Util.readDWord(s);
    smk.treesSize = Util.readDWord(s);
    smk.mMap_Size = Util.readDWord(s);
    smk.mClr_Size = Util.readDWord(s);
    smk.full_Size = Util.readDWord(s);
    smk.type_Size = Util.readDWord(s);
    for (i = 0; i < 7; i++)
      smk.audioRate[i] = Util.readDWord(s);
    smk.dummy = Util.readDWord(s);

    /* setup data */
    if (smk.nbFrames > 0xFFFFFF)
      throw new InvalidDataException("Too many frames: " + smk.nbFrames);

    return smk;
  };

  this.calcFps = function (/*SmackerHeader*/smk) {
    if (smk.pts_Inc > 0)
      return 1000.0 / smk.pts_Inc;
    else if (smk.pts_Inc < 0)
      return 100000.0 / (-smk.pts_Inc);
    else
      return 10.0;
  };

  /// <summary>
  /// Returns a decoder for this Smackerfile
  /// </summary>
  this.__defineGetter__ ("decoder", function () {
			   return new scsharp.smk.Decoder (this);
			 });

  this.createFromStream = function (/*Stream*/ s) {
    var i;

    this.header = this.readHeader(s);

    var nbFrames = this.header.nbFrames;
    //The ring frame is not counted!
    if (this.header.hasRingFrame()) nbFrames++;

    this.frameSizes = [];
    this.frameTypes = [];

    this.isV4 = (this.header.signature != Util.makeTag("S", "M", "K", "2"));

    /* read frame info */

    for (i = 0; i < nbFrames; i++) {
      this.frameSizes[i] = Util.readDWord(s);
    }
    for (i = 0; i < nbFrames; i++) {
      this.frameTypes[i] = Util.readByte(s);
    }

    //The rest of the header is a bitstream
    var m = new scsharp.smk.BitStream(s);

    //Read huffman trees

    //MMap
    // System.Console.WriteLine("Mono map tree");
    this.mMap = new scsharp.smk.BigHuffmantree();
    this.mMap.buildTree(m);
    //MClr (color map)
    //  System.Console.WriteLine("Mono Color tree");
    this.mClr = new scsharp.smk.BigHuffmantree();
    this.mClr.buildTree(m);
    //Full (full block stuff)
    // System.Console.WriteLine("Full tree");
    this.full = new scsharp.smk.BigHuffmantree();
    this.full.buildTree(m);
    //Type (full block stuff)
    // System.Console.WriteLine("Type descriptor tree");
    this.type = new scsharp.smk.BigHuffmantree();
    this.type.buildTree(m);

    //We are ready to decode frames

    this.stream = s;
  };

  this.createFromStream (stream);
};

scsharp.smk.SmackerHeader = function () {
  /* Smacker file header */
  this.signature = 0;
  this.height = 0;
  this.width = 0;

  this.nbFrames = 0;
  this.pts_Inc = 0;

  this.fps = 0.0;

  this.flags = 0;

  this.audioSize = [];

  this.treeSize = 0;

  this.mMap_Size = 0;
  this.mClr_Size = 0;
  this.full_Size = 0;
  this.type_Size = 0;

  this.audioRate = [];
  this.dummy = 0;

  /// <summary>
  /// Returns the sample rate for the specified audio track
  /// </summary>
  /// <param name="i">the audio track to return the sample rate for</param>
  /// <returns>The smaple rate for track i</returns>
  this.getSampleRate = function (/*int*/ i) {
    return (this.audioRate[i] & 0xFFFFFF); //Mask out the upper byte
  };

  this.isStereoTrack = function (/*int*/ i) {
    return ((this.audioRate[i] >> 24) & 16) > 0;
  };

  this.is16BitTrack = function (/*int*/ i) {
    return ((this.audioRate[i] >> 24) & 32) > 0;
  };

  this.isCompressedTrack = function (/*int*/ i) {
    return ((this.audioRate[i] >> 24) & 128) > 0;
  };

  this.hasRingFrame = function () {
    return (this.flags & 1) > 0;
  };

  this.isYInterlaced = function () {
    return (this.flags & 2) > 0;
  };

  this.isYDoubled = function () {
    return (this.flags & 4) > 0;
  };
};
