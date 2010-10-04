if (!window.scsharp) scsharp = {};
if (!window.scsharp.smk) scsharp.smk = {};

/// <summary>
/// Creates a new decoder for the specified file
/// </summary>
/// <param name="file">the file to create a decoder for</param>
scsharp.smk.Decoder = function (/*SmackerFile*/ file) {

  var i;

  this.firstTime = true; // Indicates whether the animation is decoded for the first time

  //File being decoded
  this.file = file;
  this.lastAudioData = [];
  for (i = 0; i < 7; i ++)
    this.lastAudioData[i] = [];


  /// <summary>
  /// Property containing the raw video data
  /// For each pixel there is a byte specifying an index in the palette
  /// </summary>
  this.lastFrameData = [];
  for (i = 0; i < this.file.header.width * this.file.header.height; i++)
    this.lastFrameData[i] = 0;

  // palette map used in Smacker
  this.smackerMap = [
    0x00, 0x04, 0x08, 0x0C, 0x10, 0x14, 0x18, 0x1C,
    0x20, 0x24, 0x28, 0x2C, 0x30, 0x34, 0x38, 0x3C,
    0x41, 0x45, 0x49, 0x4D, 0x51, 0x55, 0x59, 0x5D,
    0x61, 0x65, 0x69, 0x6D, 0x71, 0x75, 0x79, 0x7D,
    0x82, 0x86, 0x8A, 0x8E, 0x92, 0x96, 0x9A, 0x9E,
    0xA2, 0xA6, 0xAA, 0xAE, 0xB2, 0xB6, 0xBA, 0xBE,
    0xC3, 0xC7, 0xCB, 0xCF, 0xD3, 0xD7, 0xDB, 0xDF,
    0xE3, 0xE7, 0xEB, 0xEF, 0xF3, 0xF7, 0xFB, 0xFF
  ];

  // Runlength map (used in block decoding)
  this.sizetable = [
    1,    2,    3,    4,    5,    6,    7,    8,
    9,   10,   11,   12,   13,   14,   15,   16,
    17,   18,   19,   20,   21,   22,   23,   24,
    25,   26,   27,   28,   29,   30,   31,   32,
    33,   34,   35,   36,   37,   38,   39,   40,
    41,   42,   43,   44,   45,   46,   47,   48,
    49,   50,   51,   52,   53,   54,   55,   56,
    57,   58,   59,  128,  256,  512, 1024, 2048
  ];

  /// <summary>
  /// The palette to use to render the frame
  /// </summary>
  // Palette containts 256 byte triples
  this.currentPalette = [];
  for (var p = 0; p < 256; p ++)
    this.currentPalette[p] = { r:0, g:0, b:0 };

  //Current Frame being decoded
  this.currentFrame = 0;


  /// <summary>
  /// fills in the video data as RGBA data
  /// </summary>
  this.getRGBAData = function (canvasData) {
    for (var i = 0; i < this.lastFrameData.length; i++) {
      var j = i * 4;
//      console.log ("data["+i+"] = {" +
//		   this.currentPalette[this.lastFrameData[i]].r + ", " +
//		   this.currentPalette[this.lastFrameData[i]].g + ", " +
//		   this.currentPalette[this.lastFrameData[i]].b + "}");
      var pal = this.currentPalette[this.lastFrameData[i]];
      canvasData.data[j] = pal.r;
      canvasData.data[j + 1] = pal.g;
      canvasData.data[j + 2] = pal.b;
      if (pal.r != 0 || pal.g != 0 || pal.b != 0)
	canvasData.data[j + 3] = 0xFF;
      else
	canvasData.data[j + 3] = 0x00;
    }
  };

  /// <summary>
  /// fills in the video data as BGRA data
  /// </summary>
  this.getBGRAData = function (canvasData) {
    for (var i = 0; i < this.lastFrameData.length; i++) {
      var j = i * 4;
      var pal = this.currentPalette[this.lastFrameData[i]];
      canvasData.data[j] = pal.b;
      canvasData.data[j + 1] = pal.g;
      canvasData.data[j + 2] = pal.r;
      if (pal.r != 0 || pal.g != 0 || pal.b != 0)
        canvasData.data[j + 3] = 0xFF;
      else
	canvasData.data[j + 3] = 0x00;
    }
  };
};

scsharp.smk.Decoder.prototype = {

  updatePalette: function () {
    // System.Console.WriteLine("Updating palette");
    var s = this.file.stream;
    var oldPallette = this.currentPalette.slice(); // copy the array
    var size = Util.readByte(s);
    //For some dark reason we need to mask out the lower two bits
    var frameSize = this.file.frameSizes[this.currentFrame] & (~3);
    size = size * 4 - 1;

    frameSize -= size;
    frameSize--;
    var sz = 0;
    var pos = s.position + size;
    var palIndex = 0;
    while (sz < 256) {
      var t = Util.readByte(s);
      if ((t & 0x80) != 0) {
        /* skip palette entries */
        sz += (t & 0x7F) + 1;
	for (var i = 0; i < (t & 0x7F) + 1 && sz < 256; i++) {
	  this.currentPalette[palIndex++] = { r:0, g:0, b:0, a:255 };
        }
      }
      else if ((t & 0x40) != 0) {
        /* copy with offset */
        var off = Util.readByte(s);
	var j = (t & 0x3F) + 1;
        while ((j-- != 0) && sz < 256) {
          this.currentPalette[palIndex++] = oldPallette[off];
          sz++;
          off++;
        }
      }
      else {
        /* new entries */
        this.currentPalette[palIndex++] = { r: this.smackerMap[t], g: this.smackerMap[Util.readByte(s) & 0x3F], b: this.smackerMap[Util.readByte(s) & 0x3F] };
        sz++;
      }
    }
    s.seek(pos, "begin");
  },

  getIndex: function (/*uint*/ x, /*uint*/ y) {
    return x + this.file.header.width * y;
  },

  /// <summary>
  /// Reads the next frame.
  /// </summary>
  readNextFrame: function () {
    var mask = 1;

    if (this.currentFrame >= this.file.header.nbFrames)
      throw "No more frames";

    var currentPos = this.file.stream.position;

    //If this frame has a palette record
    if ((this.file.frameTypes[this.currentFrame] & mask) > 0) {
      //Update the palette
      this.updatePalette();
    }

    //Sound data
    mask <<= 1;
    for (var i = 0; i < 7; i++, mask <<= 1) {
      if ((this.file.frameTypes[this.currentFrame] & mask) > 0) {
        var pos = this.file.stream.position;
        var length = Util.readDWord(this.file.stream);

        //We assume compression, if not, well too bad
        var unpackedLength = Util.readDWord(this.file.stream);
        var m = new scsharp.smk.BitStream (this.file.stream);
        if (m.readBits(1) != 0) { //Audio present
          var stereo = m.readBits(1) > 0;
          var is16Bit = m.readBits(1) > 0;

          //Next are some trees
          var nbTrees = 1;
          if (stereo)
            nbTrees <<= 1;
          if (is16Bit)
            nbTrees <<= 1;
          var tree = [];
          var audioData = new Array(unpackedLength + 4);
          var audioDataIndex = 0;
          for (var k = 0; k < nbTrees; k++) {
            tree[k] = new scsharp.smk.Huffmantree();
            tree[k].buildTree(m);
          }

          var res;
          if (is16Bit) {
            var rightBaseMSB = 0, rightBaseLSB = 0, leftBaseMSB = 0, leftBaseLSB = 0;
            rightBaseMSB = m.readBits(8);
            rightBaseLSB = m.readBits(8);
            //Add sample (little endian)
            audioData[audioDataIndex++] = rightBaseLSB; //Lower byte
            audioData[audioDataIndex++] = rightBaseMSB; //Higher byte
            if (stereo) {
              leftBaseMSB = m.readBits(8);
              leftBaseLSB = m.readBits(8);
              //Add sample (little endian)
              audioData[audioDataIndex++] = leftBaseLSB; //Lower byte
              audioData[audioDataIndex++] = leftBaseMSB; //Higher byte
            }

            for (var l = 0; l < Math.floor(unpackedLength / 2); l++) {
              if ((l & ((stereo) ? 1 : 0)) > 0) {
                res = tree[2].decode(m);
                leftBaseLSB += res;
                res = tree[3].decode(m);
                leftBaseMSB += res;
                leftBaseMSB += leftBaseLSB >> 8;
                leftBaseLSB &= 0xFF;

                //Add sample (little endian)
                audioData[audioDataIndex++] = leftBaseLSB; //Lower byte
                audioData[audioDataIndex++] = leftBaseMSB; //Higher byte
              }
              else {
                res = tree[0].decode(m);
                rightBaseLSB += res;
                res = tree[1].decode(m);
                rightBaseMSB += res;
                rightBaseMSB += rightBaseLSB >> 8;
                rightBaseLSB &= 0xFF;

                //Add sample (little endian)
                audioData[audioDataIndex++] = rightBaseLSB; //Lower byte
                audioData[audioDataIndex++] = rightBaseMSB; //Higher byte
              }
            }
          }
          else {
            var rightBase = m.readBits(8), leftBase = 0;

            //Add sample
            audioData[audioDataIndex++] = rightBase;

            if (stereo) {
              leftBase = m.readBits(8);
              //Add sample
              audioData[audioDataIndex++] = leftBase;
            }

            for (var l = 0; l < unpackedLength; l++) {
              if ((l & ((stereo) ? 1 : 0)) > 0) {
                leftBase += tree[1].decode(m);
                //Add sample
                audioData[audioDataIndex++] = leftBase;
              }
              else {
                rightBase += tree[0].decode(m);
                //Add sample
                audioData[audioDataIndex++] = rightBase;
              }
            }
          }
          this.lastAudioData[i] = audioData;
        }

        this.file.stream.seek(pos + length, "begin");
      }
    }

    //Video data
    try {
      this.decodeVideo();
    }
    catch (exc) {
      console.log ("Exception caught while decoding frame:" + exc);
    }

    //Seek to the next frame
    this.file.stream.seek(currentPos + this.file.frameSizes[this.currentFrame], "begin");
    this.currentFrame++;
  },

  /// <summary>
  /// Returns the audiodata from the specified audiostream
  /// </summary>
  /// <param name="streamIndex">The index of the stream to return audio data for, should be between 0 and 7</param>
  /// <returns>PCM Audio data in a byte array</returns>
  getAudioData: function (/*int*/ streamIndex) {
    return this.lastAudioData[streamIndex];
  },

  decodeVideo: function () {
    var x, y, mask, currentBlock = 0, runLength, colors, blockHeader, blockType = 0;
    var posX, posY, index, pix, pix1, pix2, i, j;
    var color, color1, color2;

    //Reset all huffman decoders
    this.file.mClr.resetDecoder();
    this.file.mMap.resetDecoder();
    this.file.type.resetDecoder();
    this.file.full.resetDecoder();

    //Allocate a new frame's data
    var currentFrameData = [];
    for (i = 0; i < this.file.header.width * this.file.header.height; i++)
      currentFrameData[i] = 0;

    var m = new scsharp.smk.BitStream(this.file.stream);

    var nbBlocksX = Math.floor (this.file.header.width / 4);
    var nbBlocksY = Math.floor (this.file.header.height / 4);
    var nbBlocks = nbBlocksX * nbBlocksY;

    var runLengthNotComplete = 0;
    while (currentBlock < nbBlocks) {
      blockHeader = this.file.type.decode(m);
      runLength = this.sizetable[(blockHeader >> 2) & 0x3F];

      blockType = blockHeader & 3;
      //   System.Console.Write("BLOCK " + currentBlock + " " + runLength + " ");

      switch (blockType) {
      case 2: //VOID BLOCK
        //  System.Console.WriteLine("VOID - ");

        //Get block address
        for (i = 0; i < runLength && currentBlock < nbBlocks; i++) {
          //Get current block coordinates
          posX = 4 * (currentBlock % nbBlocksX);
          posY = 4 * Math.floor(currentBlock / nbBlocksX);
          index = 0;
          for (x = 0; x < 4; x++) {
            for (y = 0; y < 4; y++) {
              index = this.getIndex(posX + x, posY + y);
              currentFrameData[index] = this.lastFrameData[index];
            }
          }

          currentBlock++;
        }
        runLengthNotComplete = runLength - i;
        break;
      case 3: //SOLID BLOCK
        //     System.Console.WriteLine("SOLID - ");
        color = blockHeader >> 8;

        //Get block address
        for (i = 0; i < runLength && currentBlock < nbBlocks; i++) {
          //Get current block coordinates
          posX = 4 * (currentBlock % nbBlocksX);
          posY = 4 * Math.Floor(currentBlock / nbBlocksX);
          for (x = 0; x < 4; x++) {
            for (y = 0; y < 4; y++) {
              currentFrameData[this.getIndex(posX + x, posY + y)] = color;
            }
          }

          currentBlock++;
        }
        runLengthNotComplete = runLength - i;
        break;
      case 0: //MONO BLOCK
        //    System.Console.WriteLine("MONO - ");
        for (i = 0; i < runLength && currentBlock < nbBlocks; i++) {
          colors = this.file.mClr.decode(m);
          color1 = colors >> 8;
          color2 = colors & 0xFF;

          mask = this.file.mMap.decode(m);
          posX = (currentBlock % nbBlocksX) * 4;
          posY = Math.floor(currentBlock / nbBlocksX) * 4;
          for (y = 0; y < 4; y++) {
            if ((mask & 1) > 0) {
              currentFrameData[this.getIndex(posX, posY + y)] = color1;
            }
            else {
              currentFrameData[this.getIndex(posX, posY + y)] = color2;
            }
            if ((mask & 2) > 0) {
              currentFrameData[this.getIndex(posX + 1, posY + y)] = color1;
            }
            else {
              currentFrameData[this.getIndex(posX + 1, posY + y)] = color2;
            }
            if ((mask & 4) > 0) {
              currentFrameData[this.getIndex(posX + 2, posY + y)] = color1;
            }
            else {
              currentFrameData[this.getIndex(posX + 2, posY + y)] = color2;
            }
            if ((mask & 8) > 0) {
              currentFrameData[this.getIndex(posX + 3, posY + y)] = color1;
            }
            else {
              currentFrameData[this.getIndex(posX + 3, posY + y)] = color2;
            }

            mask >>= 4;
          }
          currentBlock++;
        }
        //  runLengthNotComplete = runLength - i;
        break;
      case 1:
        //    System.Console.WriteLine("FULL - ");
        var mode = 0;
        if (this.file.isV4) {
          var type = m.readBits(1);

          if (type == 0) {
            var abit = m.readBits(1);
            if (abit == 1)
              mode = 2;
          }
          else
            mode = 1;
        }

        switch (mode) {
        case 0://v2 Full block

          for (i = 0; i < runLength && currentBlock < nbBlocks; i++) {
            posX = (currentBlock % nbBlocksX) * 4;
            posY = Math.floor(currentBlock / nbBlocksX) * 4;
            for (y = 0; y < 4; y++) {
              colors = this.file.full.decode(m);
              color1 = colors >> 8;
              color2 = colors & 0xFF;

              currentFrameData[this.getIndex(posX + 3, posY + y)] = color1;
              currentFrameData[this.getIndex(posX + 2, posY + y)] = color2;


              colors = this.file.full.decode(m);
              color1 = (colors >> 8);
              color2 = (colors & 0xFF);
              currentFrameData[this.getIndex(posX + 1, posY + y)] = color1;
              currentFrameData[this.getIndex(posX + 0, posY + y)] = color2;

            }
            currentBlock++;
          }
          break;
        case 1:
          for (i = 0; i < runLength && currentBlock < nbBlocks; i++) {
            posX = (currentBlock % nbBlocksX) * 4;
            posY = Math.floor(currentBlock / nbBlocksX) * 4;
            pix = this.file.full.decode(m);

            color1 = (pix >> 8);
            color2 = (pix & 0xFF);

            currentFrameData[this.getIndex(posX + 0, posY + 0)] = color2;
            currentFrameData[this.getIndex(posX + 1, posY + 0)] = color2;
            currentFrameData[this.getIndex(posX + 2, posY + 0)] = color1;
            currentFrameData[this.getIndex(posX + 3, posY + 0)] = color1;
            currentFrameData[this.getIndex(posX + 0, posY + 1)] = color2;
            currentFrameData[this.getIndex(posX + 1, posY + 1)] = color2;
            currentFrameData[this.getIndex(posX + 2, posY + 1)] = color1;
            currentFrameData[this.getIndex(posX + 3, posY + 1)] = color1;

            pix = this.file.full.decode(m);

            color1 = (pix >> 8);
            color2 = (pix & 0xFF);

            currentFrameData[this.getIndex(posX + 0, posY + 2)] = color2;
            currentFrameData[this.getIndex(posX + 1, posY + 2)] = color2;
            currentFrameData[this.getIndex(posX + 2, posY + 2)] = color1;
            currentFrameData[this.getIndex(posX + 3, posY + 2)] = color1;
            currentFrameData[this.getIndex(posX + 0, posY + 3)] = color2;
            currentFrameData[this.getIndex(posX + 1, posY + 3)] = color2;
            currentFrameData[this.getIndex(posX + 2, posY + 3)] = color1;
            currentFrameData[this.getIndex(posX + 3, posY + 3)] = color1;

            currentBlock++;
          }
          //          runLengthNotComplete = runLength - i;
          break;
        case 2:
          for (j = 0; j < runLength && currentBlock < nbBlocks; j++) {
            posX = (currentBlock % nbBlocksX) << 2;
            posY = Math.floor(currentBlock / nbBlocksX) << 2;
            for (i = 0; i < 2; i++) {
              pix1 = this.file.full.decode(m);
              pix2 = this.file.full.decode(m);

              color1 = (pix1 >> 8);
              color2 = (pix1 & 0xFF);

              currentFrameData[this.getIndex(posX + 2, posY + (i << 1))] = color2;
              currentFrameData[this.getIndex(posX + 3, posY + (i << 1))] = color1;
              currentFrameData[this.getIndex(posX + 2, posY + (i << 1) + 1)] = color2;
              currentFrameData[this.getIndex(posX + 3, posY + (i << 1) + 1)] = color1;


              color1 = (pix1 >> 8);
              color2 = (pix1 & 0xFF);


              currentFrameData[this.getIndex(posX + 0, posY + (i << 1))] = color2;
              currentFrameData[this.getIndex(posX + 1, posY + (i << 1))] = color1;
              currentFrameData[this.getIndex(posX + 0, posY + (i << 1) + 1)] = color2;
              currentFrameData[this.getIndex(posX + 1, posY + (i << 1) + 1)] = color1;


            }
            currentBlock++;
          }
          //          runLengthNotComplete = runLength - j;
          break;
        default:
          break;
        }

        break;
      }
    }

    //if (runLengthNotComplete > 0)
    //{
    //    Console.WriteLine("Warning: frame ended before runlength has reached zero");
    //}

    this.lastFrameData = currentFrameData;
  },

  /// <summary>
  /// Resets the decoder to the first frame, if there is a ring frame the first frame is skipped as it should.
  /// </summary>
  reset: function () {
    var nbFrames = this.file.header.nbFrames;

    if (this.file.header.hasRingFrame())
      nbFrames++;

    // Seek to the beginning of the frame data section
    // Header = 104 bytes, 5 bytes per frame (one dword + one byte) + trees
    var pos = 104 + 5 * nbFrames + this.file.header.treesSize;
    this.file.stream.seek(pos, "begin");
    this.currentFrame = 0;

    // The ring frame replace the first frame on the second+ run.
    if (!this.firstTime && this.file.header.hasRingFrame()) {
      // Seek ahead 1 frame
      this.file.stream.seek(this.file.frameSizes[0], "current");
      this.currentFrame = 1;
    }

    this.firstTime = false;
  }

};
