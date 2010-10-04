if (!window.scsharp) scsharp = {};
if (!window.scsharp.smk) scsharp.smk = {};

scsharp.smk.HuffmanNode = function () {
  this.left = null;
  this.right = null;
  this.isLeaf = false;
  this.value = null;
};

scsharp.smk.HuffmanNode.prototype = {
  Print: function (/*optional string prefix*/) {
    var prefix = arguments.count == 0 ? "" : arguments[0].toString();

    console.log(prefix + ((this.isLeaf) ? "Leaf: " + this.value : "No Leaf"));
    if (this.left != null) this.left.Print(prefix + " L:");
    if (this.right != null) this.right.Print(prefix + " R:");
  }
};

scsharp.smk.Huffmantree = function () {
  this.rootNode = null;
};

scsharp.smk.Huffmantree.prototype = {
  /// <summary>
  /// Builds a new 8-bit huffmantree. The used algorithm is based on
  /// http://wiki.multimedia.cx/index.php?title=Smacker#Packed_Huffman_Trees
  /// </summary>
  /// <param name="m">The stream to build the tree from</param>
  buildTree : function (/*BitStream*/ m)
  {
    //Read tag
    var tag = m.readBits(1);
    //If tag is zero, finish
    if (tag == 0) return;

    //Init tree
    this.rootNode = new scsharp.smk.HuffmanNode();

    this.buildTreeRecurse (m, this.rootNode);

    //For some reason we have to skip a bit
    m.readBits(1);
  },

  /// <summary>
  /// Decodes a value using this tree based on the next bits in the specified stream
  /// </summary>
  /// <param name="m">The stream to read bits from</param>
  decode: function (/*BitStream*/ m)
  {
    var currentNode = this.rootNode;
    if (currentNode == null)
      return 0;
    while (!currentNode.isLeaf) {
      var bit = m.readBits(1);
      if (bit == 0) {
        currentNode = currentNode.left;
      }
      else {
        currentNode = currentNode.right;
      }
    }
    return currentNode.value;
  },


  buildTreeRecurse: function (/*BitStream*/ m, /*Node*/ current)
  {
    //Read flag
    var flag = m.readBits(1);
    //If flag is nonzero
    if (flag != 0) {
      //Advance to "0"-branch
      var left = new scsharp.smk.HuffmanNode();
      //Recursive call
      this.buildTreeRecurse (m, left);

      //The first left-node is actually the root
      if (current == null) {
        this.rootNode = left;
        return;
      }
      else
        current.left = left;
    }
    else {
      //If flag is zero
      if (current == null) {
	current = new scsharp.smk.HuffmanNode();
	this.rootNode = current;
      }
      //Read 8 bit leaf
      var leaf = m.readBits(8);
      //Console.WriteLine("Decoded :" + leaf);
      current.isLeaf = true;
      current.value = leaf;
      return;
    }

    //Continue on the "1"-branch
    current.right = new scsharp.smk.HuffmanNode();
    this.buildTreeRecurse (m, current.right);
  },

  PrintTree: function () {
    this.rootNode.Print();
  }
};



scsharp.smk.BigHuffmantree = function () {
  scsharp.smk.Huffmantree.call (this); // chain up to ctor

  this.highByteTree = null;
  this.lowByteTree = null;

  this.marker1 = null;
  this.marker2 = null;
  this.marker3 = null;

  this.iMarker1 = 0;
  this.iMarker2 = 0;
  this.iMarker3 = 0;
};

scsharp.smk.BigHuffmantree.prototype = new scsharp.smk.Huffmantree();

/// <summary>
/// Decodes a value using this tree based on the next bits in the specified stream
/// </summary>
/// <param name="m">The stream to read bits from</param>
scsharp.smk.BigHuffmantree.prototype.decode = function (/*BitStream*/ m) {
  //int v = base.Decode(m);
  var currentNode = this.rootNode;
  if (currentNode == null)
    return 0;
  while (!currentNode.isLeaf) {
    var bit = m.readBits(1);
    if (bit == 0) {
      currentNode = currentNode.left;
    }
    else {
      currentNode = currentNode.right;
    }
  }

  var v = currentNode.value;

  if (v != this.iMarker1) {
    this.iMarker3 = this.iMarker2;
    this.iMarker2 = this.iMarker1;
    this.iMarker1 = v;

    this.marker3.value = this.marker2.value;
    this.marker2.value = this.marker1.value;
    this.marker1.value = v;

  }
  return v;
};

/// <summary>
/// Resets the dynamic decoder markers to zero
/// </summary>
scsharp.smk.BigHuffmantree.prototype.resetDecoder = function () {
  if (this.marker1)
    this.marker1.value = 0;
  if (this.marker2)
    this.marker2.value = 0;
  if (this.marker3)
    this.marker3.value = 0;

  this.iMarker1 = 0;
  this.iMarker2 = 0;
  this.iMarker3 = 0;
};

scsharp.smk.BigHuffmantree.prototype.buildTree = function (/*BitStream*/ m) {
  //Read tag
  var tag = m.readBits(1);
  //If tag is zero, finish
  if (tag == 0) return;
  this.lowByteTree = new scsharp.smk.Huffmantree();
  this.lowByteTree.buildTree(m);


  this.highByteTree = new scsharp.smk.Huffmantree();
  this.highByteTree.buildTree(m);


  this.iMarker1 = m.readBits(16);
  //System.Console.WriteLine("M1:" + iMarker1);
  this.iMarker2 = m.readBits(16);
  //System.Console.WriteLine("M2:" + iMarker2);
  this.iMarker3 = m.readBits(16);
  //System.Console.WriteLine("M3:" + iMarker3);
  this.rootNode = new scsharp.smk.HuffmanNode();
  this.buildTreeRecurse(m, this.rootNode);

  //For some reason we have to skip a bit
  m.readBits(1);

  if (this.marker1 == null) {
    // System.Console.WriteLine("Not using marker 1");
    this.marker1 = new scsharp.smk.HuffmanNode();
  }
  if (this.marker2 == null) {
    //  System.Console.WriteLine("Not using marker 2");
    this.marker2 = new scsharp.smk.HuffmanNode();
  }
  if (this.marker3 == null) {
    //   System.Console.WriteLine("Not using marker 3");
    this.marker3 = new scsharp.smk.HuffmanNode();
  }
};

scsharp.smk.BigHuffmantree.buildTreeRecurse = function (/*BitStream*/ m, /*Node*/ current) {
  //Read flag
  var flag = m.readBits(1);
  //If flag is nonzero
  if (flag != 0) {
    //Advance to "0"-branch
    var left = new scsharp.smk.HuffmanNode();
    //Recursive call
    this.buildTreeRecurse(m, left);

    //The first left-node is actually the root
    if (current == null) {
      this.rootNode = left;
      return;
    }
    else
      current.left = left;
  }
  else { //If flag is zero
    if (current == null) {
      current = new scsharp.smk.HuffmanNode();
      this.rootNode = current;
    }
    //Read 16 bit leaf by decoding the low byte, then the high byte
    var lower = this.lowByteTree.decode(m);
    var higher = this.highByteTree.decode(m);
    var leaf = lower | (higher << 8);
    //System.Console.WriteLine("Decoded: " + leaf);
    //If we found one of the markers, store pointers to those nodes.
    if (leaf == this.iMarker1) {
      leaf = 0;
      this.marker1 = current;
    }
    if (leaf == this.iMarker2) {
      leaf = 0;
      this.marker2 = current;
    }
    if (leaf == this.iMarker3) {
      leaf = 0;
      this.marker3 = current;
    }

    current.isLeaf = true;
    current.value = leaf;
    return;
  }

  //Continue on the "1"-branch
  current.right = new scsharp.smk.HuffmanNode();
  this.buildTreeRecurse(m, current.right);
};

