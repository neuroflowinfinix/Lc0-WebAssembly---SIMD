#include <iostream>
#include <vector>
#include <zlib.h>
#include "embedded_net.h"

int main() {
  std::vector<char> buffer(30 * 1024 * 1024);
  z_stream strm;
  strm.zalloc = Z_NULL;
  strm.zfree = Z_NULL;
  strm.opaque = Z_NULL;
  strm.avail_in = network_data_len;
  strm.next_in = (Bytef*)network_data;
  if (inflateInit2(&strm, 15 + 32) != Z_OK) {
      std::cerr << "Init failed\n";
      return 1;
  }
  strm.avail_out = buffer.size();
  strm.next_out = (Bytef*)buffer.data();
  int ret = inflate(&strm, Z_FINISH);
  if (ret != Z_STREAM_END) {
    std::cerr << "Inflate failed: " << ret << "\n";
    return 1;
  }
  std::cout << "Success: " << strm.total_out << " bytes\n";
  return 0;
}
