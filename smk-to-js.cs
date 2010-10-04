
using System;
using System.IO;

public class SmkToJs {
	public static void Main (string[] args) {
		Console.WriteLine ("var smk_data = [ ");
		byte[] buffer = new byte[2048];
		using (Stream s = File.OpenRead (args[0])) {
			while (true) {
				int n = s.Read (buffer, 0, buffer.Length);
				
				if (n <= 0)
					break;

				for (int i = 0; i < n; i ++) {
					Console.Write ("0x{0:x}", (int)buffer[i]);

					if (i < n || s.Position < s.Length)
						Console.Write (",");
				}
			}
		}

		Console.WriteLine (" ];");
	}
}