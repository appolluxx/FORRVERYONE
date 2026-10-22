import struct
import json

asar_path = r'C:\Users\john\AppData\Local\Programs\roboBlocks IDE\resources\app.asar'

with open(asar_path, 'rb') as f:
    u32_1, u32_2, u32_3, header_len = struct.unpack('<IIII', f.read(16))
    header_json = f.read(header_len).decode('utf-8')
    header = json.loads(header_json)
    base_offset = 16 + header_len

    def get_file(curr_path):
        curr = header
        for p in curr_path.strip('/').split('/'):
            curr = curr['files'][p]
        f.seek(base_offset + int(curr['offset']))
        return f.read(int(curr['size'])).decode('utf-8', errors='ignore')

    atom_idx = get_file('microBlock-IDE/boards/atom-vx/index.js')
    p = atom_idx.find('addBoard')
    print(atom_idx[p:p+1500])
