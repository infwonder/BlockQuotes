pragma solidity ^0.4.6;
contract StringMapper {

    uint public itemcount;
    uint itemdeleted;
    uint pagemax;

    mapping(bytes32 => string) map;
    mapping(bytes32 => uint) dmap;
    mapping(bytes32 => address) pmap;
    mapping(uint => string) listum;
    mapping(uint => bytes32) deleted;

    struct associate {
        uint replycount;
        mapping(uint => string) posts;
        mapping(uint => uint) rdmap;
        mapping(uint => address) rpmap;
    }

    mapping(bytes32 => associate) replies;

    function StringMapper() payable { 
        itemcount = 0;
        itemdeleted = 0;
        pagemax = 32;
    }

    function stringToBytes32(string memory source) constant returns (bytes32 result) {
        assembly {
           result := mload(add(source, 32))
        }
    }

    function stringToBytes32s(string memory source, uint N) constant returns (bytes32 result) {
        assembly {
           result := mload(add(source, N))
        }
    }

    function title(string memory source) constant returns (bytes32[7] result) {
        uint srclen = bytes(source).length;
        uint parts;

        if (srclen <= 32) { 
          parts = 1;
        } else {
          uint restpt = srclen % 32;
          parts = (srclen - restpt) / 32;
          if (restpt != 0) parts++;
        }

        if (parts > 4) parts = 4;

        for (uint i = 1; i <= parts; i++) {
          uint N = i * 32;
          result[i-1] = stringToBytes32s(source, N);
        }
    }

    function addKeyValue(string key, string value) payable returns(bool){
        if (bytes(key).length == 0 || bytes(value).length == 0) throw;
        itemcount++;

        bytes32 hash = sha3(key);
        if(bytes(map[hash]).length != 0) throw;

        // update data
        map[hash] = value;
        dmap[hash] = now;
        pmap[hash] = msg.sender;
        listum[itemcount] = key;
        replies[hash] = associate(0);

        return true;
    }

    function addReply(bytes32 postid, string comment) payable returns(bool) {
        if (bytes(comment).length == 0 || bytes(map[postid]).length == 0) throw;
        replies[postid].replycount++;
        uint rid = replies[postid].replycount;
        replies[postid].posts[rid] = comment;
        replies[postid].rdmap[rid] = now;
        replies[postid].rpmap[rid] = msg.sender;

        return true;
    }

    function getReplyRaw(bytes32 postid, uint id) constant returns(string resp, uint date, address poster) {
        if (replies[postid].replycount < id) throw;
        resp = replies[postid].posts[id];
        date = replies[postid].rdmap[id];
        poster = replies[postid].rpmap[id];
    }

    function getReplyCount(bytes32 postid) constant returns (uint count) {
        return replies[postid].replycount;
    }

    function getReply(bytes32 postid, uint start, uint end) constant returns(bytes32[7][] results) {
        if (start < 0 || end < 0 || replies[postid].replycount == 0) throw;

        if (end+1 > replies[postid].replycount) end = replies[postid].replycount - 1;

        uint al = end - start + 1;

        if (al > pagemax || al <= 0) throw;

        results = new bytes32[7][](al);
        for (uint i = start; i <= end; i++) {
          results[i-start] = title(replies[postid].posts[i+1]);
          results[i-start][4] = bytes32(replies[postid].rdmap[i+1]);
          results[i-start][5] = bytes32(replies[postid].rpmap[i+1]);
        }

        return results;
    }

    function dumpData(uint start, uint end) constant returns(bytes32[7][] results) { 
        if (start < 0 || end < 0 || itemcount == 0) throw;

        if (end+1 > itemcount) end = itemcount - 1;

        uint al = end - start + 1;

        if (al > pagemax || al <= 0) throw;

        results = new bytes32[7][](al);

        for (uint i = start; i <= end; i++) {
            results[i-start] = title(listum[i+1]);
            bytes32 hash = sha3( listum[i+1] );
            results[i-start][4] = hash;
            results[i-start][5] = bytes32(dmap[hash]);
            results[i-start][6] = bytes32(pmap[hash]);
        }

        return results; 
    }

    function doSha3( string testingString ) constant returns (bytes32) { return sha3( testingString ); }

    function getValueByHash(bytes32 hash) constant returns(uint date, string value, address author){
        date = dmap[hash];
        author = pmap[hash];
        value = map[hash];
    }

    function getValue(string key) constant returns(string){
        bytes32 hash = sha3( key );
        return map[hash];
    }

    function getKey(uint id) constant returns (bytes32) {
        return stringToBytes32(listum[id]);
    }

    function getAllKeys() constant returns (bytes32[1][] results) {
        results = new bytes32[1][](itemcount);

        for (uint i = 0; i < itemcount; i++) {
            uint id = i + 1;
            if (uint(deleted[id]) != 0) continue;
            results[i][0] = stringToBytes32(listum[id]);
        }
        return results;
    }

    function delKeyValue(uint id, bytes32 hash) payable returns(bool) {
        if(bytes(listum[id]).length == 0 || sha3 (listum[id]) != hash) throw;
        itemdeleted++;
        deleted[id] = hash;
        if (packTable() == false) throw;
    }

    function packTable() payable returns(bool) {
        uint newtotal;
        uint delete_count = 0;
      
        for (uint i = 0; i < itemcount; i++) {
            uint id = i + 1;

            if (uint(deleted[id]) != 0) { 
                delete map[deleted[id]];
                delete dmap[deleted[id]];
                delete pmap[deleted[id]];
                delete replies[deleted[id]];
                delete_count++;
                delete listum[id];
                delete deleted[id];
                continue; 
            }

            listum[id - delete_count] = listum[id];
            if (delete_count != 0) {
                delete listum[id];
            }
            newtotal++;
        }

        itemcount = newtotal;
        itemdeleted = 0;
    }
}
