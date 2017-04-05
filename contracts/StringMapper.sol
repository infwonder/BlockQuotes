pragma solidity ^0.4.6;
contract StringMapper {

    uint itemcount;
    uint itemdeleted;
    uint itemmax;
    uint pagemax;
    mapping(bytes32 => string) map;
    mapping(uint => string) listum;
    mapping(uint => bytes32) deleted;

    bytes32[3][] alldata;

    function StringMapper() payable { 
      itemcount = 0;
      itemdeleted = 0;
      itemmax = 128;
      pagemax = 32;
      alldata = new bytes32[3][](itemmax);
    }

    function stringToBytes32(string memory source) constant returns (bytes32 result) {
        assembly {
           result := mload(add(source, 32))
        }
    }

    function addKeyValue(string key, string value) payable returns(bool){
        if (bytes(key).length == 0 || bytes(value).length == 0) throw;
        itemcount++;
        if (itemcount > itemmax) throw;

        bytes32 hash = sha3(key);
        if(bytes(map[hash]).length != 0) throw;

        // update data
        map[hash] = value;
        listum[itemcount] = key;

        alldata[itemcount-1][1] = stringToBytes32(key);
        alldata[itemcount-1][0] = hash;
        alldata[itemcount-1][1] = stringToBytes32(value);

        return true;
    }

    function dumpData(uint start, uint end) constant returns(bytes32[3][] results) { 
      if (start < 0 || end < 0) throw;

      uint al = end - start + 1;

      if (al > pagemax || al <= 0) throw;

      results = new bytes32[3][](al);

      for (uint i = start; i <= end; i++) {
        results[i-start][0] = alldata[i][0];
        results[i-start][1] = alldata[i][1];
        results[i-start][2] = alldata[i][2];
      }

      return results; 
    }

    function getHash(string key) constant returns(bytes32[2][] hash) {
       hash = new bytes32[2][](1);
       hash[0][0] = stringToBytes32('bobogaga');
       hash[0][1] = sha3(key);
    }

    function doSha3( string testingString ) constant returns (bytes32) { return sha3( testingString ); }

    function getValue(string key) constant returns(string){
        bytes32 hash = sha3(key);
        return map[hash];
    }

    function getValueFromHash(bytes32 hash) constant returns(string){
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

    function delKeyValue(uint id) payable returns(bool) {
      if(bytes(listum[id]).length == 0) throw;
      itemdeleted++;
      deleted[id] = sha3( listum[id] );
    }

    function packTable() payable returns(bool) {
      uint newtotal;
      uint delete_count = 0;
      
      for (uint i = 0; i < itemcount; i++) {
        uint id = i + 1;

        if (uint(deleted[id]) != 0) { 
          delete map[deleted[id]];
          delete_count++;
          delete listum[id];
          delete deleted[id];
          delete alldata[i];
          continue; 
        }

        listum[id - delete_count] = listum[id];
        alldata[i - delete_count] = alldata[i];
        if (delete_count != 0) {
          delete listum[id];
          delete alldata[i];
        }
        newtotal++;
      }

      itemcount = newtotal;
      itemdeleted = 0;
    }
}
