pragma solidity ^0.4.6;
contract StringMapper {

    uint itemcount;
    uint itemdeleted;
    mapping(bytes32 => string) map;
    mapping(uint => string) listum;
    mapping(uint => bytes32) deleted;

    function StringMapper() payable { itemcount = 0; }

    function addKeyValue(string key, string value) payable returns(bool){
        if (bytes(key).length == 0 || bytes(value).length == 0) throw;

        bytes32 hash = sha3(key);
        if(bytes(map[hash]).length != 0){ // Don't overwrite previous mappings and return false
            return false;
        }
        map[hash] = value;
        itemcount++;
        listum[itemcount] = key;

        return true;
    }

    function stringToBytes32(string memory source) constant returns (bytes32 result) {
        assembly {
           result := mload(add(source, 32))
        }
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

    function getAllKeys() constant returns (bytes32[2][] results) {
      results = new bytes32[2][](itemcount);

      for (uint i = 0; i < itemcount; i++) {
        uint id = i + 1;
        if (uint(deleted[id]) != 0) continue;
        results[i][0] = bytes32(id);
        results[i][1] = stringToBytes32(listum[id]);
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
          continue; 
        }

        listum[id - delete_count] = listum[id];
        if (delete_count != 0) delete listum[id];
        newtotal++; 
      }

      itemcount = newtotal;
      itemdeleted = 0;
    }
}
